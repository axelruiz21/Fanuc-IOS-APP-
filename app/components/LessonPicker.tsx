import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LESSONS } from '../lessons';
import { theme } from '../theme';

export interface LessonPickerProps {
  onLoadLesson: (id: string) => void;
}

export const LessonPicker: React.FC<LessonPickerProps> = ({ onLoadLesson }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Lessons</Text>
      <View style={styles.row}>
        {LESSONS.map((lesson) => (
          <TouchableOpacity
            key={lesson.id}
            style={styles.chip}
            onPress={() => onLoadLesson(lesson.id)}
            accessibilityRole="button"
            accessibilityLabel={`Load lesson ${lesson.title}`}
          >
            <Text style={styles.chipText}>{lesson.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: theme.bg,
  },
  label: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '600',
  },
});
