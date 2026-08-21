/**
 * Viewport3D Component
 * Fallback XY projection when the GL tree throws.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
} from 'react-native';
import { theme, type } from '../theme';

export interface Position {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface Viewport3DProps {
  currentPosition?: Position | null;
  isLoading?: boolean;
  hideTitle?: boolean;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  currentPosition,
  isLoading = false,
  hideTitle = false,
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const radius = Math.min(size.width, size.height) * 0.35;
  const maxCoord = 400;
  const projectedX = currentPosition
    ? centerX + (currentPosition.x / maxCoord) * radius
    : centerX;
  const projectedY = currentPosition
    ? centerY - (currentPosition.y / maxCoord) * radius
    : centerY;

  const renderCoordinateDisplay = () => {
    if (!currentPosition) {
      return (
        <Text style={styles.placeholderText}>No pose</Text>
      );
    }

    if (size.width === 0 || size.height === 0) {
      return null;
    }

    return (
      <View style={styles.projectionContainer}>
        {/* Grid background */}
        <View style={styles.grid} />

        {/* Origin */}
        <View
          style={[
            styles.origin,
            {
              left: centerX,
              top: centerY,
            },
          ]}
        >
          <Text style={styles.originLabel}>O</Text>
        </View>

        {/* Robot end-effector position */}
        <View
          style={[
            styles.endEffector,
            {
              left: projectedX,
              top: projectedY,
            },
          ]}
        />

        {/* Connection line from origin to end-effector */}
        <View
          style={[
            styles.linkLine,
            {
              width: Math.sqrt(
                (projectedX - centerX) ** 2 + (projectedY - centerY) ** 2
              ),
              left: centerX,
              top: centerY,
              transform: [
                {
                  rotate: `${Math.atan2(projectedY - centerY, projectedX - centerX) * (180 / Math.PI)}deg`,
                },
              ],
            },
          ]}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!hideTitle && (
        <View style={styles.header}>
          <Text style={styles.title}>Arm</Text>
          {isLoading && <Text style={styles.loadingText}>Rendering...</Text>}
        </View>
      )}

      <View
        style={styles.viewportArea}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setSize({ width, height });
        }}
      >
        {renderCoordinateDisplay()}
      </View>

      {currentPosition && (
        <ScrollView style={styles.coordinatesPanel} horizontal>
          <View style={styles.coordinatesList}>
            <CoordinateRow label="X" value={currentPosition.x.toFixed(2)} unit="mm" />
            <CoordinateRow label="Y" value={currentPosition.y.toFixed(2)} unit="mm" />
            <CoordinateRow label="Z" value={currentPosition.z.toFixed(2)} unit="mm" />
            <CoordinateRow label="Rx" value={currentPosition.rx.toFixed(2)} unit="°" />
            <CoordinateRow label="Ry" value={currentPosition.ry.toFixed(2)} unit="°" />
            <CoordinateRow label="Rz" value={currentPosition.rz.toFixed(2)} unit="°" />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

interface CoordinateRowProps {
  label: string;
  value: string;
  unit: string;
}

const CoordinateRow: React.FC<CoordinateRowProps> = ({ label, value, unit }) => (
  <View style={styles.coordinateRow}>
    <Text style={styles.coordinateLabel}>{label}:</Text>
    <Text style={styles.coordinateValue}>{value}</Text>
    <Text style={styles.coordinateUnit}>{unit}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: theme.bg,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...type.label,
  },
  loadingText: {
    fontSize: 11,
    color: theme.muted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  viewportArea: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  placeholderText: {
    fontSize: 11,
    color: theme.muted,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  projectionContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: theme.bg,
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  origin: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.rule,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
    marginTop: -4,
    zIndex: 10,
  },
  originLabel: {
    color: theme.bg,
    fontSize: 0,
  },
  endEffector: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.text,
    zIndex: 15,
    marginLeft: -4,
    marginTop: -4,
  },
  linkLine: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.rule,
    zIndex: 5,
  },
  coordinatesPanel: {
    backgroundColor: theme.panel,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    maxHeight: 72,
  },
  coordinatesList: {
    flexDirection: 'row',
    padding: 12,
    gap: 16,
  },
  coordinateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coordinateLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: theme.muted,
  },
  coordinateValue: {
    fontSize: 12,
    color: theme.text,
    minWidth: 50,
    textAlign: 'right',
    fontFamily: 'Menlo',
  },
  coordinateUnit: {
    fontSize: 10,
    color: theme.muted,
  },
});
