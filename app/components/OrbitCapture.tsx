import type { MutableRefObject, ReactNode } from 'react';
import type { OrbitState } from '../viewer/orbit';

/** Web: drei OrbitControls owns the pointer; no wrapper capture. */
export function OrbitCapture({
  children,
}: {
  children: ReactNode;
  orbitRef: MutableRefObject<OrbitState>;
}) {
  return <>{children}</>;
}
