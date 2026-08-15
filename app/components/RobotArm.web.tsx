/**
 * RobotArm Component - Web/Expo Fallback
 * Phase 4: 3D Robot Arm Rendering
 * Canvas-based fallback when Three.js is not available
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export interface Position {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface RobotArmProps {
  position?: Position | null;
  animated?: boolean;
}

/**
 * Web fallback: Canvas-based 2D drawing
 * Shows orthographic projections of the robot arm
 */
const Canvas2DRobot = React.lazy(() =>
  Promise.resolve({
    default: ({ position }: { position?: Position | null }) => {
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const animationRef = useRef<number>();

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
          const width = canvas.width;
          const height = canvas.height;
          const centerX = width / 2;
          const centerY = height / 2;

          // Clear canvas
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, width, height);

          // Draw grid
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          const gridSize = 20;
          for (let i = 0; i < width; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
          }
          for (let i = 0; i < height; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
          }

          // Draw origin
          ctx.fillStyle = '#2196F3';
          ctx.beginPath();
          ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
          ctx.fill();

          if (position) {
            // Draw target position
            const scale = 0.2; // Scale down for visualization
            const targetX = centerX + position.x * scale;
            const targetY = centerY - position.z * scale;

            // Draw line from origin to target
            ctx.strokeStyle = '#9C27B0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();

            // Draw target point
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(targetX, targetY, 8, 0, Math.PI * 2);
            ctx.fill();

            // Draw coordinate info
            ctx.fillStyle = '#d4d4d4';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`X: ${position.x.toFixed(1)}`, 10, height - 60);
            ctx.fillText(`Y: ${position.y.toFixed(1)}`, 10, height - 40);
            ctx.fillText(`Z: ${position.z.toFixed(1)}`, 10, height - 20);
          }

          // Draw axes
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(centerX + 50, centerY);
          ctx.stroke();

          ctx.strokeStyle = '#00ff00';
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(centerX, centerY - 50);
          ctx.stroke();

          ctx.fillStyle = '#999';
          ctx.font = '10px monospace';
          ctx.fillText('X', centerX + 55, centerY + 5);
          ctx.fillText('Z', centerX + 5, centerY - 55);

          animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        };
      }, [position]);

      return (
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 8,
          }}
        />
      );
    },
  })
);

/**
 * RobotArmViewer component
 */
export const RobotArmViewer: React.FC<RobotArmProps> = ({
  position,
}) => {
  const isWeb = typeof document !== 'undefined';

  if (isWeb) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1a1a',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <React.Suspense
          fallback={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#999',
              }}
            >
              Loading 3D renderer...
            </div>
          }
        >
          <Canvas2DRobot position={position} />
        </React.Suspense>
      </div>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          3D rendering not available on this platform
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  fallbackText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default RobotArmViewer;
