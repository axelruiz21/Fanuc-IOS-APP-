/**
 * Execution log — bone on black, rust for errors.
 */

import React, { useEffect, useRef } from 'react';
import { displayLineNumber } from '../editor/programCounter';
import { theme, type } from '../theme';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Platform,
} from 'react-native';

export interface ExecutionConsoleProps {
  logs: string[];
  currentLineNumber?: number;
  autoScroll?: boolean;
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  logs = [],
  currentLineNumber,
  autoScroll = true,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (autoScroll && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [logs, autoScroll]);

  const renderLogLine = (log: string, index: number) => {
    const isError = log.includes('[ERROR]') || log.includes('[BREAKPOINT]');
    return (
      <Text key={index} style={[styles.logLine, isError && styles.logError]}>
        {log}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={type.label}>Log</Text>
        {currentLineNumber !== undefined && (
          <Text
            style={styles.lineCounter}
            accessibilityLabel={`Current line ${displayLineNumber(currentLineNumber)}`}
          >
            {displayLineNumber(currentLineNumber)}
          </Text>
        )}
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
      >
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>Awaiting play</Text>
        ) : (
          <View style={styles.logContainer}>
            {logs.map((log, index) => renderLogLine(log, index))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.panel,
  },
  header: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineCounter: {
    fontSize: 11,
    color: theme.muted,
    fontFamily: MONO,
    letterSpacing: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  logContainer: {
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  logLine: {
    fontSize: 11,
    fontFamily: MONO,
    lineHeight: 16,
    color: theme.muted,
    paddingVertical: 1,
  },
  logError: {
    color: theme.danger,
  },
  emptyText: {
    color: theme.muted,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
