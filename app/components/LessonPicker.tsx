import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LESSONS } from '../lessons';
import { theme, type } from '../theme';

export interface LessonPickerProps {
  onLoadLesson: (id: string) => void;
}

export const LessonPicker: React.FC<LessonPickerProps> = ({ onLoadLesson }) => {
  return (
    <View style={styles.container}>
      <Text style={type.label}>Lessons</Text>
      <View style={styles.row}>
        {LESSONS.map((lesson) => (
          <TouchableOpacity
            key={lesson.id}
            style={styles.link}
            onPress={() => onLoadLesson(lesson.id)}
            accessibilityRole="button"
            accessibilityLabel={`Load lesson ${lesson.title}`}
          >
            <Text style={styles.linkText}>{lesson.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: theme.panel,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  link: {
    minHeight: 36,
    justifyContent: 'center',
  },
  linkText: {
    color: theme.text,
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
