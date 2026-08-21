/**
 * Transport: Play / Pause / Step / Reset as editorial text.
 */

import React, { useCallback } from 'react';
import { theme, type } from '../theme';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
} from 'react-native';

export interface ExecutionControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onResume?: () => void;
  onBreakpoint?: () => void;
  status?: string;
  errorMessage?: string | null;
}

const Ghost: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  active?: boolean;
}> = ({ label, onPress, disabled, accessibilityLabel, active }) => (
  <TouchableOpacity
    style={[styles.button, disabled && styles.buttonDisabled]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled: Boolean(disabled) }}
  >
    <Text style={[styles.buttonText, active && styles.buttonTextActive]}>{label}</Text>
  </TouchableOpacity>
);

export const ExecutionControls: React.FC<ExecutionControlsProps> = ({
  isRunning,
  isPaused,
  onPlay,
  onPause,
  onStep,
  onReset,
  onResume,
  onBreakpoint,
  status = 'Ready',
  errorMessage,
}) => {
  const handlePlayPress = useCallback(() => {
    if (isPaused) {
      (onResume ?? onPlay)();
    } else if (!isRunning) {
      onPlay();
    }
  }, [isPaused, isRunning, onPlay, onResume]);

  const statusLabel = isRunning && !isPaused ? 'Running' : isPaused ? 'Paused' : status;

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <Text style={type.label}>{statusLabel}</Text>
      </View>
      {!!errorMessage && (
        <Text style={styles.errorText} numberOfLines={3}>
          {errorMessage}
        </Text>
      )}
      <View style={styles.controlsRow}>
        <Ghost
          label={isPaused ? 'Resume' : 'Play'}
          onPress={handlePlayPress}
          disabled={isRunning && !isPaused}
          accessibilityLabel={isPaused ? 'Resume program' : 'Play program'}
          active={!isRunning || isPaused}
        />
        <Ghost
          label="Pause"
          onPress={onPause}
          disabled={!isRunning || isPaused}
          accessibilityLabel="Pause program"
        />
        <Ghost
          label="Step"
          onPress={onStep}
          disabled={isRunning && !isPaused}
          accessibilityLabel="Step one line"
        />
        <Ghost label="Reset" onPress={onReset} accessibilityLabel="Reset execution" />
        {onBreakpoint && (
          <Ghost
            label="Break"
            onPress={onBreakpoint}
            accessibilityLabel="Add breakpoint at current line"
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.panel,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 11,
    color: theme.danger,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.28,
  },
  buttonText: {
    color: theme.text,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  buttonTextActive: {
    color: theme.rule,
  },
});
