import React, {
  Component,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing';
import type { EffectComposer as EffectComposerImpl } from 'postprocessing';

type EffectsErrorHandler = (error: unknown, componentStack?: string) => void;

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

  return (
    <EffectComposer ref={composerRef} multisampling={0} enableNormalPass>
      <N8AO aoRadius={0.12} intensity={1.15} />
      <Bloom luminanceThreshold={1.15} intensity={0.22} mipmapBlur />
      <Vignette offset={0.35} darkness={0.42} />
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
