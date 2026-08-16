/**
 * CodeEditor Component
 * FANUC program editor with syntax highlighting
 * Phase 2: UI Components
 */

import React, { useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../theme';

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  readOnly?: boolean;
  currentLine?: number | null;
}

interface LineNumberProps {
  lineCount: number;
  currentLine?: number | null;
}

const LineNumbers: React.FC<LineNumberProps> = ({ lineCount, currentLine }) => {
  return (
    <View style={styles.lineNumbers}>
      {Array.from({ length: lineCount || 1 }, (_, i) => {
        const isCurrent = currentLine === i;
        return (
          <Text
            key={i}
            style={[styles.lineNumber, isCurrent && styles.lineNumberCurrent]}
            accessibilityLabel={
              isCurrent ? `Line ${i + 1}, current line` : `Line ${i + 1}`
            }
          >
            {i + 1}
          </Text>
        );
      })}
    </View>
  );
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  currentLine = null,
}) => {
  const lineCount = value.split('\n').length;

  const handleChange = useCallback(
    (text: string) => {
      onChange(text);
    },
    [onChange]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.editorContainer}>
        <ScrollView
          horizontal
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.editorRow}>
            <LineNumbers lineCount={lineCount} currentLine={currentLine} />
            <TextInput
              style={[styles.input, readOnly && styles.inputReadOnly]}
              value={value}
              onChangeText={handleChange}
              multiline
              editable={!readOnly}
              placeholderTextColor={theme.muted}
              placeholder={'; Enter FANUC program here\n\nMOVE P[1]\nDOUT OT[1]=ON\nWAIT 1.0\nEND'}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect={false}
              scrollEnabled={false}
              accessibilityLabel="FANUC program editor"
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    overflow: 'hidden',
    margin: 8,
  },
  editorRow: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
  },
  lineNumbers: {
    backgroundColor: '#252526',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#3e3e42',
  },
  lineNumber: {
    color: '#858585',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    height: 18,
    lineHeight: 18,
  },
  lineNumberCurrent: {
    color: theme.currentLineText,
    backgroundColor: theme.currentLine,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    color: '#d4d4d4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e1e1e',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minWidth: 300,
  },
  inputReadOnly: {
    backgroundColor: '#2d2d30',
  },
});
