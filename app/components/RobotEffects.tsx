import React, { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing';

class EffectsBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('RobotEffects disabled after composer error', error, info.componentStack);
    this.props.onError();
  }

  render(): ReactNode {
    if (this.state.failed) {
      return null;
    }
    return this.props.children;
  }
}

export function RobotEffects(): React.ReactElement | null {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return null;
  }
  return (
    <EffectsBoundary onError={() => setFailed(true)}>
      <EffectComposer multisampling={0} enableNormalPass>
        <N8AO aoRadius={0.12} intensity={1.15} />
        <Bloom luminanceThreshold={1.15} intensity={0.22} mipmapBlur />
        <Vignette offset={0.35} darkness={0.42} />
        <SMAA />
      </EffectComposer>
    </EffectsBoundary>
  );
}
