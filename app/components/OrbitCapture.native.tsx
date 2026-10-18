import { useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { PanResponder, View, StyleSheet, type GestureResponderEvent } from 'react-native';
import {
  panOrbit,
  rotateOrbit,
  zoomOrbit,
  type OrbitState,
} from '../viewer/orbit';

const ROTATE_RAD_PER_PX = 0.005;
const PAN_PER_PX = 0.0025;

type TouchPoint = { pageX: number; pageY: number };

function eventTouches(event: GestureResponderEvent): TouchPoint[] {
  const nativeTouches = event.nativeEvent.touches;
  if (nativeTouches && nativeTouches.length > 0) {
    return Array.from(nativeTouches);
  }
  return [{ pageX: event.nativeEvent.pageX, pageY: event.nativeEvent.pageY }];
}

function touchDistance(touches: TouchPoint[]): number {
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

function touchMid(touches: TouchPoint[]): { x: number; y: number } {
  const [a, b] = touches;
  return { x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 };
}

/**
 * Native: 1-finger rotate, pinch zoom, two-finger pan. Shared orbit.ts math.
 */
export function OrbitCapture({
  children,
  orbitRef,
}: {
  children: ReactNode;
  orbitRef: MutableRefObject<OrbitState>;
}) {
  const gesture = useRef({
    lastX: 0,
    lastY: 0,
    lastDist: 1,
    lastMid: { x: 0, y: 0 },
  });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const touches = eventTouches(event);
          gesture.current.lastX = event.nativeEvent.pageX;
          gesture.current.lastY = event.nativeEvent.pageY;
          if (touches.length >= 2) {
            gesture.current.lastDist = Math.max(touchDistance(touches), 1);
            gesture.current.lastMid = touchMid(touches);
          }
        },
        onPanResponderMove: (event) => {
          const touches = eventTouches(event);
          if (touches.length >= 2) {
            const dist = Math.max(touchDistance(touches), 1);
            const mid = touchMid(touches);
            const factor = dist / gesture.current.lastDist;
            orbitRef.current = zoomOrbit(orbitRef.current, factor);
            const scale = PAN_PER_PX * orbitRef.current.radius;
            orbitRef.current = panOrbit(
              orbitRef.current,
              -(mid.x - gesture.current.lastMid.x) * scale,
              (mid.y - gesture.current.lastMid.y) * scale
            );
            gesture.current.lastDist = dist;
            gesture.current.lastMid = mid;
            return;
          }
          const x = event.nativeEvent.pageX;
          const y = event.nativeEvent.pageY;
          orbitRef.current = rotateOrbit(
            orbitRef.current,
            (x - gesture.current.lastX) * ROTATE_RAD_PER_PX,
            -(y - gesture.current.lastY) * ROTATE_RAD_PER_PX
          );
          gesture.current.lastX = x;
          gesture.current.lastY = y;
        },
      }),
    [orbitRef]
  );

  return (
    <View style={styles.fill} {...responder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
