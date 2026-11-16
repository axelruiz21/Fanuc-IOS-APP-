import React, {
  Component,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { EffectComposer as EffectComposerImpl } from 'postprocessing';
import * as THREE from 'three';

type EffectsErrorHandler = (error: unknown, componentStack?: string | null) => void;

class EffectsBoundary extends Component<
  { onError: EffectsErrorHandler; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError(error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return null;
    }
    return this.props.children;
  }
}

function GuardedEffectComposer({
  onError,
}: {
  onError: EffectsErrorHandler;
}): React.ReactElement {
  const composerRef = useRef<EffectComposerImpl | null>(null);

  useLayoutEffect(() => {
    const composer = composerRef.current;
    if (!composer) {
      return;
    }
    const originalRender = composer.render;
    let failed = false;
    const guardedRender: typeof originalRender = (deltaTime) => {
      if (failed) {
        return;
      }
      try {
        originalRender.call(composer, deltaTime);
      } catch (error) {
        failed = true;
        onError(error);
      }
    };
    composer.render = guardedRender;
    return () => {
      if (composer.render === guardedRender) {
        composer.render = originalRender;
      }
    };
  }, [onError]);

  /*
   * Half-float scene buffer so the fixtures' emissive and the clearcoat
   * highlights survive into Bloom; ACES runs after it, SMAA last. Three skips
   * its own tone mapping when rendering into the composer target, so the
   * ToneMapping pass is the only one.
   */
  return (
    <EffectComposer
      ref={composerRef}
      multisampling={0}
      frameBufferType={THREE.HalfFloatType}
    >
      <N8AO aoRadius={0.22} distanceFalloff={0.55} intensity={2.2} quality="medium" halfRes />
      <Bloom luminanceThreshold={1.15} luminanceSmoothing={0.2} intensity={0.35} radius={0.55} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.28} darkness={0.55} eskil={false} />
      <SMAA />
    </EffectComposer>
  );
}

export function RobotEffects(): React.ReactElement | null {
  const [failed, setFailed] = useState(false);
  const handleError = useCallback<EffectsErrorHandler>((error, componentStack) => {
    console.warn('RobotEffects disabled after composer error', error, componentStack ?? '');
    setFailed(true);
  }, []);
  if (failed) {
    return null;
  }
  return (
    <EffectsBoundary onError={handleError}>
      <GuardedEffectComposer onError={handleError} />
    </EffectsBoundary>
  );
}
