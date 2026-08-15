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

export interface IOPanelProps {
  digitalInputs: Record<number, boolean>;
  digitalOutputs: Record<number, boolean>;
  registers: Record<number, number>;
  onDigitalInputChange?: (index: number, value: boolean) => void;
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
}) => {
  const [activeTab, setActiveTab] = useState<'inputs' | 'outputs' | 'registers'>('inputs');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <Tab
          label="DI (Inputs)"
          isActive={activeTab === 'inputs'}
          onPress={() => setActiveTab('inputs')}
        />
        <Tab
          label="DO (Outputs)"
          isActive={activeTab === 'outputs'}
          onPress={() => setActiveTab('outputs')}
        />
        <Tab
          label="PR (Registers)"
          isActive={activeTab === 'registers'}
          onPress={() => setActiveTab('registers')}
        />
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
      </ScrollView>

      {activeTab === 'inputs' && (
        <Text style={styles.hint}>
          Tap digital inputs to simulate ON/OFF
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 8,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#2196F3',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  registerGrid: {
    gap: 12,
  },
  ioItem: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ioItemActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  ioItemOutput: {
    opacity: 0.7,
  },
  ioItemDisabled: {
    opacity: 0.5,
  },
  ioLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  ioIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  ioIndicatorActive: {
    backgroundColor: '#4CAF50',
  },
  registerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2196F3',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hint: {
    fontSize: 11,
    color: '#999',
    paddingHorizontal: 12,
    paddingBottom: 8,
    fontStyle: 'italic',
  },
});
