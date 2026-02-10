/**
 * Viewport3D Component
 * 3D viewport placeholder for robot arm visualization
 * Phase 2 / Phase 4: 3D Rendering Integration
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Dimensions,
} from 'react-native';

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
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  currentPosition,
  isLoading = false,
}) => {
  const windowWidth = Dimensions.get('window').width;
  
  // Placeholder visualization: simple 2D representation
  // Phase 4 will upgrade this to Three.js with react-three-fiber
  const renderCoordinateDisplay = () => {
    if (!currentPosition) {
      return (
        <Text style={styles.placeholderText}>
          No position data. Run program to see position updates.
        </Text>
      );
    }

    const maxCoord = 400;
    const centerX = windowWidth / 2 - 70;
    const centerY = 150;

    // Simple 2D projection (XY plane)
    const projectedX = centerX + (currentPosition.x / maxCoord) * 100;
    const projectedY = centerY - (currentPosition.y / maxCoord) * 100;

    return (
      <View style={styles.projectionContainer}>
        {/* Grid background */}
        <View style={styles.grid} />

        {/* Origin */}
        <View style={styles.origin}>
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
      <View style={styles.header}>
        <Text style={styles.title}>3D Viewport (XY Projection)</Text>
        {isLoading && <Text style={styles.loadingText}>Rendering...</Text>}
      </View>

      <View style={styles.viewportArea}>
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

      <Text style={styles.phaseNote}>
        Phase 4: Three.js 3D rendering will replace this placeholder
      </Text>
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
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 8,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  loadingText: {
    fontSize: 11,
    color: '#999',
  },
  viewportArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  placeholderText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  projectionContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  origin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    left: '50%',
    top: '50%',
    marginLeft: -12,
    marginTop: -12,
    zIndex: 10,
  },
  originLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  endEffector: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    zIndex: 15,
    marginLeft: -10,
    marginTop: -10,
  },
  linkLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#9C27B0',
    zIndex: 5,
    transformOrigin: '0% 50%',
  },
  coordinatesPanel: {
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    maxHeight: 80,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  coordinateValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2196F3',
    minWidth: 50,
    textAlign: 'right',
  },
  coordinateUnit: {
    fontSize: 10,
    color: '#999',
  },
  phaseNote: {
    fontSize: 10,
    color: '#999',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontStyle: 'italic',
    backgroundColor: '#fafafa',
    textAlign: 'center',
  },
});
