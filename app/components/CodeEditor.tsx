/**
 * FANUC program editor — editorial night
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

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

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
            {String(i + 1).padStart(2, '0')}
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
              placeholder={'; program'}
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
    backgroundColor: theme.panel,
  },
  editorContainer: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  editorRow: {
    flexDirection: 'row',
    backgroundColor: theme.bg,
  },
  lineNumbers: {
    backgroundColor: theme.bg,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.border,
  },
  lineNumber: {
    color: theme.muted,
    fontSize: 11,
    fontFamily: MONO,
    height: 18,
    lineHeight: 18,
  },
  lineNumberCurrent: {
    color: theme.currentLineText,
  },
  input: {
    flex: 1,
    color: theme.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.bg,
    fontSize: 12,
    fontFamily: MONO,
    minWidth: 300,
    lineHeight: 18,
  },
  inputReadOnly: {
    opacity: 0.7,
  },
});
