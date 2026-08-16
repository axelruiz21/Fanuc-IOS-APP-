import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import type { Position } from '../utils/interpreter';
import { theme } from '../theme';

const POSITION_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const AXES = ['x', 'y', 'z', 'rx', 'ry', 'rz'] as const;

export interface PositionPanelProps {
  positions: Record<number, Position>;
  currentPosition: Position | null;
  onDefinePosition: (index: number, position: Position) => void;
  onTeachCurrent: (index: number) => void;
}

function fieldsFromPosition(position: Position): Record<(typeof AXES)[number], string> {
  return {
    x: String(position.x),
    y: String(position.y),
    z: String(position.z),
    rx: String(position.rx),
    ry: String(position.ry),
    rz: String(position.rz),
  };
}

export const PositionPanel: React.FC<PositionPanelProps> = ({
  positions,
  currentPosition,
  onDefinePosition,
  onTeachCurrent,
}) => {
  const [selected, setSelected] = useState(1);
  const [fields, setFields] = useState(fieldsFromPosition(positions[1]));
  const [parseError, setParseError] = useState<string | null>(null);

  const selectedPose = positions[selected] ?? {
    x: 0,
    y: 0,
    z: 0,
    rx: 0,
    ry: 0,
    rz: 0,
  };

  useEffect(() => {
    setFields(fieldsFromPosition(selectedPose));
    setParseError(null);
  }, [
    selected,
    selectedPose.x,
    selectedPose.y,
    selectedPose.z,
    selectedPose.rx,
    selectedPose.ry,
    selectedPose.rz,
  ]);

  const handleApply = useCallback(() => {
    const parsed: Partial<Position> = {};
    for (const axis of AXES) {
      const value = Number(fields[axis]);
      if (!Number.isFinite(value)) {
        setParseError(`P[${selected}] ${axis.toUpperCase()} must be a number`);
        return;
      }
      parsed[axis] = value;
    }
    setParseError(null);
    onDefinePosition(selected, parsed as Position);
  }, [fields, onDefinePosition, selected]);

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Edit P[n] then Apply, or Teach the last successful MOVE pose. rx,ry,rz are XYZ RPY
        degrees, not FANUC WPR.
      </Text>
      <View style={styles.chips}>
        {POSITION_INDEXES.map((index) => (
          <TouchableOpacity
            key={index}
            style={[styles.chip, selected === index && styles.chipSelected]}
            onPress={() => setSelected(index)}
            accessibilityRole="button"
            accessibilityLabel={`Select position P[${index}]`}
            accessibilityState={{ selected: selected === index }}
          >
            <Text style={[styles.chipText, selected === index && styles.chipTextSelected]}>
              P[{index}]
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.fields}>
        {AXES.map((axis) => (
          <View key={axis} style={styles.field}>
            <Text style={styles.fieldLabel}>{axis.toUpperCase()}</Text>
            <TextInput
              style={styles.input}
              value={fields[axis]}
              onChangeText={(text) => setFields((prev) => ({ ...prev, [axis]: text }))}
              keyboardType="numeric"
              accessibilityLabel={`P[${selected}] ${axis.toUpperCase()}`}
            />
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleApply}
          accessibilityRole="button"
          accessibilityLabel={`Apply coordinates to P[${selected}]`}
        >
          <Text style={styles.buttonText}>Apply P[{selected}]</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.teachButton, !currentPosition && styles.buttonDisabled]}
          onPress={() => onTeachCurrent(selected)}
          disabled={!currentPosition}
          accessibilityRole="button"
          accessibilityLabel={`Teach current pose to P[${selected}]`}
        >
          <Text style={styles.buttonText}>Teach current</Text>
        </TouchableOpacity>
      </View>
      {parseError ? <Text style={styles.error}>{parseError}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  hint: {
    fontSize: 11,
    color: theme.muted,
    fontStyle: 'italic',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: theme.accent,
    backgroundColor: theme.currentLine,
  },
  chipText: {
    color: theme.muted,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  chipTextSelected: {
    color: theme.currentLineText,
    fontWeight: '700',
  },
  fields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  field: {
    width: '30%',
    minWidth: 90,
  },
  fieldLabel: {
    color: theme.muted,
    fontSize: 10,
    marginBottom: 4,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 4,
    color: theme.text,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 44,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    backgroundColor: theme.step,
    borderRadius: 6,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  teachButton: {
    backgroundColor: theme.play,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  error: {
    color: theme.danger,
    fontSize: 12,
  },
});
