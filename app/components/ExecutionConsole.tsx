/**
 * ExecutionConsole Component
 * Display execution log and real-time program output
 * Phase 2: UI Components
 */

import React, { useEffect, useRef } from 'react';
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
    let color = '#d4d4d4';
    let backgroundColor = '#1e1e1e';

    if (log.includes('[ERROR]')) {
      color = '#f48771';
      backgroundColor = '#3d2d2d';
    } else if (log.includes('[BREAKPOINT]')) {
      color = '#ff5252';
      backgroundColor = '#3d2d2d';
    } else if (log.includes('[STEP]')) {
      color = '#64b5f6';
    } else if (log.includes('[WARN]')) {
      color = '#ffb74d';
    } else if (log.includes('MOVE')) {
      color = '#81c784';
    } else if (log.includes('WAIT')) {
      color = '#ffb74d';
    } else if (log.includes('DOUT')) {
      color = '#ba68c8';
    } else if (log.includes('IF') || log.includes('FOR')) {
      color = '#64b5f6';
    }

    return (
      <Text
        key={index}
        style={[
          styles.logLine,
          { color, backgroundColor },
        ]}
      >
        {log}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Execution Log</Text>
        {currentLineNumber !== undefined && (
          <Text style={styles.lineCounter}>
            Line: {currentLineNumber}
          </Text>
        )}
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
      >
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No logs yet. Run a program to see output.</Text>
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
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    margin: 8,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#252526',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3e3e42',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d4d4d4',
  },
  lineCounter: {
    fontSize: 11,
    color: '#858585',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  scrollContainer: {
    flex: 1,
  },
  logContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logLine: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
    color: '#d4d4d4',
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginVertical: 1,
    borderRadius: 2,
  },
  emptyText: {
    color: '#858585',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
});
