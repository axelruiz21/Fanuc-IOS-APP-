/**
 * ExecutionControls Component
 * PLAY, PAUSE, STEP, RESET buttons with status display
 * Phase 2: UI Components
 */

import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';

export interface ExecutionControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onBreakpoint?: () => void;
  status?: string;
  errorMessage?: string;
}

export const ExecutionControls: React.FC<ExecutionControlsProps> = ({
  isRunning,
  isPaused,
  onPlay,
  onPause,
  onStep,
  onReset,
  onBreakpoint,
  status = 'Ready',
  errorMessage,
}) => {
  const handlePlayPress = useCallback(() => {
    if (isPaused) {
      onPlay();
    } else if (!isRunning) {
      onPlay();
    }
  }, [isPaused, isRunning, onPlay]);

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <View style={styles.statusIndicator}>
          {isRunning && !isPaused && (
            <>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.statusText}>Running...</Text>
            </>
          )}
          {isPaused && (
            <>
              <View style={[styles.statusDot, styles.statusPaused]} />
              <Text style={styles.statusText}>Paused</Text>
            </>
          )}
          {!isRunning && !isPaused && (
            <>
              <View style={[styles.statusDot, styles.statusReady]} />
              <Text style={styles.statusText}>{status}</Text>
            </>
          )}
        </View>
        {errorMessage && (
          <Text style={styles.errorText} numberOfLines={1}>
            {errorMessage}
          </Text>
        )}
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.playButton,
            (isRunning && !isPaused) && styles.buttonDisabled,
          ]}
          onPress={handlePlayPress}
          disabled={isRunning && !isPaused}
        >
          <Text style={styles.buttonText}>
            {isPaused ? '▶ Resume' : '▶ Play'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.pauseButton,
            (!isRunning || isPaused) && styles.buttonDisabled,
          ]}
          onPress={onPause}
          disabled={!isRunning || isPaused}
        >
          <Text style={styles.buttonText}>⏸ Pause</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.stepButton,
            isRunning && !isPaused && styles.buttonDisabled,
          ]}
          onPress={onStep}
          disabled={isRunning && !isPaused}
        >
          <Text style={styles.buttonText}>⏭ Step</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={onReset}
        >
          <Text style={styles.buttonText}>⟲ Reset</Text>
        </TouchableOpacity>

        {onBreakpoint && (
          <TouchableOpacity
            style={[styles.button, styles.breakpointButton]}
            onPress={onBreakpoint}
          >
            <Text style={styles.buttonText}>🔴 Breakpoint</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusBar: {
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusReady: {
    backgroundColor: '#2196F3',
  },
  statusPaused: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  stepButton: {
    backgroundColor: '#2196F3',
  },
  resetButton: {
    backgroundColor: '#9C27B0',
  },
  breakpointButton: {
    backgroundColor: '#d32f2f',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
