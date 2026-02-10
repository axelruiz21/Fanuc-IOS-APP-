/**
 * CodeEditor Component
 * FANUC program editor with syntax highlighting
 * Phase 2: UI Components
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  Text,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  readOnly?: boolean;
}

interface LineNumberProps {
  lineCount: number;
}

const LineNumbers: React.FC<LineNumberProps> = ({ lineCount }) => {
  return (
    <View style={styles.lineNumbers}>
      {Array.from({ length: lineCount || 1 }, (_, i) => (
        <Text key={i} style={styles.lineNumber}>
          {i + 1}
        </Text>
      ))}
    </View>
  );
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onSave,
  readOnly = false,
}) => {
  const lineCount = value.split('\n').length;
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleChange = useCallback(
    (text: string) => {
      onChange(text);
      setCursorPosition(text.length);
    },
    [onChange]
  );

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(value);
    }
  }, [value, onSave]);

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
            <LineNumbers lineCount={lineCount} />
            <TextInput
              style={[styles.input, readOnly && styles.inputReadOnly]}
              value={value}
              onChangeText={handleChange}
              multiline
              editable={!readOnly}
              placeholderTextColor="#999"
              placeholder="; Enter FANUC program here&#10;&#10;MOVE P[1]&#10;DOUT OT[1]=ON&#10;WAIT 1.0&#10;END"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect={false}
              fontFamily={Platform.OS === 'ios' ? 'Menlo' : 'monospace'}
              fontSize={12}
              scrollEnabled={false}
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
    backgroundColor: '#f5f5f5',
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
