/**
 * IOPanel Component
 * Display and control DI[1-32], DO[1-32], and PR[1-10]
 * Phase 2: UI Components
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import type { Position } from '../utils/interpreter';
import { theme } from '../theme';
import { PositionPanel } from './PositionPanel';

export interface IOPanelProps {
  digitalInputs: Record<number, boolean>;
  digitalOutputs: Record<number, boolean>;
  registers: Record<number, number>;
  onDigitalInputChange?: (index: number, value: boolean) => void;
  positions?: Record<number, Position>;
  currentPosition?: Position | null;
  onDefinePosition?: (index: number, position: Position) => void;
  onTeachCurrent?: (index: number) => void;
}

interface TabProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const Tab: React.FC<TabProps> = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tab, isActive && styles.tabActive]}
    onPress={onPress}
    accessibilityRole="tab"
    accessibilityState={{ selected: isActive }}
    accessibilityLabel={label}
  >
    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface IOItemProps {
  label: string;
  value: boolean | number;
  index: number;
  isInput?: boolean;
  isRegister?: boolean;
  onToggle?: (index: number, value: boolean) => void;
}

const IOItem: React.FC<IOItemProps> = ({
  label,
  value,
  index,
  isInput = false,
  isRegister = false,
  onToggle,
}) => {
  const handlePress = useCallback(() => {
    if (!isRegister && isInput && onToggle) {
      onToggle(index, !value);
    }
  }, [index, value, isInput, isRegister, onToggle]);

  if (isRegister) {
    return (
      <View style={styles.ioItem}>
        <Text style={styles.ioLabel}>{label}</Text>
        <Text style={styles.registerValue}>{value}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.ioItem,
        value ? styles.ioItemActive : undefined,
        !isInput && styles.ioItemOutput,
        isInput && !onToggle && styles.ioItemDisabled,
      ]}
      onPress={handlePress}
      disabled={!isInput || !onToggle}
    >
      <Text style={styles.ioLabel}>{label}</Text>
      <View
        style={[
          styles.ioIndicator,
          value ? styles.ioIndicatorActive : undefined,
        ]}
      />
    </TouchableOpacity>
  );
};

export const IOPanel: React.FC<IOPanelProps> = ({
  digitalInputs,
  digitalOutputs,
  registers,
  onDigitalInputChange,
  positions,
  currentPosition = null,
  onDefinePosition,
  onTeachCurrent,
}) => {
  const [activeTab, setActiveTab] = useState<'inputs' | 'outputs' | 'registers' | 'positions'>('inputs');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar} accessibilityRole="tablist">
        <Tab
          label="DI"
          isActive={activeTab === 'inputs'}
          onPress={() => setActiveTab('inputs')}
        />
        <Tab
          label="DO"
          isActive={activeTab === 'outputs'}
          onPress={() => setActiveTab('outputs')}
        />
        <Tab
          label="PR"
          isActive={activeTab === 'registers'}
          onPress={() => setActiveTab('registers')}
        />
        {positions && onDefinePosition && onTeachCurrent && (
          <Tab
            label="P[]"
            isActive={activeTab === 'positions'}
            onPress={() => setActiveTab('positions')}
          />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'inputs' && (
          <View style={styles.grid}>
            {Array.from({ length: 32 }, (_, i) => i + 1).map((idx) => (
              <IOItem
                key={`di-${idx}`}
                label={`DI[${idx}]`}
                value={digitalInputs[idx] || false}
                index={idx}
                isInput={true}
                onToggle={onDigitalInputChange}
              />
            ))}
          </View>
        )}

        {activeTab === 'outputs' && (
          <View style={styles.grid}>
            {Array.from({ length: 32 }, (_, i) => i + 1).map((idx) => (
              <IOItem
                key={`do-${idx}`}
                label={`DO[${idx}]`}
                value={digitalOutputs[idx] || false}
                index={idx}
                isInput={false}
              />
            ))}
          </View>
        )}

        {activeTab === 'registers' && (
          <View style={styles.registerGrid}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((idx) => (
              <IOItem
                key={`pr-${idx}`}
                label={`PR[${idx}]`}
                value={registers[idx] || 0}
                index={idx}
                isRegister={true}
              />
            ))}
          </View>
        )}
        {activeTab === 'positions' && positions && onDefinePosition && onTeachCurrent && (
          <PositionPanel
            positions={positions}
            currentPosition={currentPosition}
            onDefinePosition={onDefinePosition}
            onTeachCurrent={onTeachCurrent}
          />
        )}
      </ScrollView>

      {activeTab === 'inputs' && (
        <Text style={styles.hint}>Tap to drive inputs</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.panel,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
    minHeight: 40,
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomColor: theme.rule,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.6,
    color: theme.muted,
  },
  tabTextActive: {
    color: theme.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  registerGrid: {
    gap: 8,
  },
  ioItem: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
  },
  ioItemActive: {
    borderColor: theme.rule,
  },
  ioItemOutput: {
    opacity: 0.72,
  },
  ioItemDisabled: {
    opacity: 0.45,
  },
  ioLabel: {
    fontSize: 11,
    color: theme.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  ioIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.border,
  },
  ioIndicatorActive: {
    backgroundColor: theme.rule,
  },
  registerValue: {
    fontSize: 13,
    color: theme.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hint: {
    fontSize: 10,
    color: theme.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
