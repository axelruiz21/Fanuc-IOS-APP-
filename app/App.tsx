/**
 * Main Application Component
 * FANUC iOS Teach Pendant MVP
 * Phases 2-4: Complete Integration
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useAppStore } from './store';
import { useRestorePersistedState, useAutoSaveState } from './store/persistence';
import { CodeEditor } from './components/CodeEditor';
import { ExecutionControls } from './components/ExecutionControls';
import { IOPanel } from './components/IOPanel';
import { ExecutionConsole } from './components/ExecutionConsole';
import { Viewport3D } from './components/Viewport3D';
import { RobotArmViewer } from './components/RobotArm';
import type { InterpreterState } from './utils/interpreter';

function SceneViewport({ interpreterState }: { interpreterState: InterpreterState }) {
  if (Platform.OS === 'web') {
    return (
      <RobotArmViewer
        joints={interpreterState.currentJoints}
        currentPosition={interpreterState.currentPosition}
      />
    );
  }
  return (
    <Viewport3D
      currentPosition={interpreterState.currentPosition}
      isLoading={false}
    />
  );
}

/**
 * Landscape layout: Editor + 3D on left, IO + Console on right
 */
const LandscapeLayout: React.FC = () => {
  const {
    program,
    setProgram,
    isRunning,
    isPaused,
    runProgram,
    pauseExecution,
    resumeExecution,
    stepExecution,
    resetExecution,
    executionLogs,
    interpreterState,
    lastError,
    addBreakpoint,
  } = useAppStore();

  const handlePlay = useCallback(() => {
    runProgram();
  }, [runProgram]);

  const handlePause = useCallback(() => {
    pauseExecution();
  }, [pauseExecution]);

  const handleResume = useCallback(async () => {
    await resumeExecution();
  }, [resumeExecution]);

  const handleStep = useCallback(async () => {
    await stepExecution();
  }, [stepExecution]);

  const handleReset = useCallback(() => {
    resetExecution();
  }, [resetExecution]);

  const handleBreakpoint = useCallback(() => {
    const currentLine = interpreterState.programCounter;
    if (currentLine >= 0) {
      addBreakpoint(currentLine);
    }
  }, [interpreterState.programCounter, addBreakpoint]);

  return (
    <View style={styles.landscapeContainer}>
      {/* Left Panel: Editor + 3D */}
      <View style={styles.leftPanel}>
        {/* Editor */}
        <View style={styles.editorSection}>
          <CodeEditor
            value={program}
            onChange={setProgram}
            readOnly={isRunning && !isPaused}
          />
        </View>

        {/* 3D Viewport */}
        <View style={styles.viewportSection}>
          <SceneViewport interpreterState={interpreterState} />
        </View>
      </View>

      {/* Right Panel: Controls + IO + Console */}
      <View style={styles.rightPanel}>
        {/* Execution Controls */}
        <ExecutionControls
          isRunning={isRunning}
          isPaused={isPaused}
          onPlay={handlePlay}
          onPause={handlePause}
          onResume={handleResume}
          onStep={handleStep}
          onReset={handleReset}
          onBreakpoint={handleBreakpoint}
          status={isPaused ? 'Paused' : isRunning ? 'Running' : 'Ready'}
          errorMessage={lastError}
        />

        {/* IO Panel */}
        <IOPanel
          digitalInputs={interpreterState.io.DI}
          digitalOutputs={interpreterState.io.DO}
          registers={interpreterState.registers.PR}
          onDigitalInputChange={(idx, val) => {
            useAppStore.getState().setDigitalInput(idx, val);
          }}
        />

        {/* Execution Console */}
        <ExecutionConsole
          logs={executionLogs}
          currentLineNumber={interpreterState.programCounter}
          autoScroll={true}
        />
      </View>
    </View>
  );
};

/**
 * Portrait layout: Stacked components
 */
const PortraitLayout: React.FC = () => {
  const {
    program,
    setProgram,
    isRunning,
    isPaused,
    runProgram,
    pauseExecution,
    resumeExecution,
    stepExecution,
    resetExecution,
    executionLogs,
    interpreterState,
    lastError,
    addBreakpoint,
  } = useAppStore();

  const handlePlay = useCallback(() => {
    runProgram();
  }, [runProgram]);

  const handlePause = useCallback(() => {
    pauseExecution();
  }, [pauseExecution]);

  const handleResume = useCallback(async () => {
    await resumeExecution();
  }, [resumeExecution]);

  const handleStep = useCallback(async () => {
    await stepExecution();
  }, [stepExecution]);

  const handleReset = useCallback(() => {
    resetExecution();
  }, [resetExecution]);

  const handleBreakpoint = useCallback(() => {
    const currentLine = interpreterState.programCounter;
    if (currentLine >= 0) {
      addBreakpoint(currentLine);
    }
  }, [interpreterState.programCounter, addBreakpoint]);

  return (
    <View style={styles.portraitContainer}>
      {/* Editor */}
      <View style={styles.portraitEditor}>
        <CodeEditor
          value={program}
          onChange={setProgram}
          readOnly={isRunning && !isPaused}
        />
      </View>

      {/* 3D Viewport */}
      <View style={styles.portraitViewport}>
        <SceneViewport interpreterState={interpreterState} />
      </View>

      {/* Controls */}
      <ExecutionControls
        isRunning={isRunning}
        isPaused={isPaused}
        onPlay={handlePlay}
        onPause={handlePause}
        onResume={handleResume}
        onStep={handleStep}
        onReset={handleReset}
        onBreakpoint={handleBreakpoint}
        status={isPaused ? 'Paused' : isRunning ? 'Running' : 'Ready'}
        errorMessage={lastError}
      />

      {/* IO Panel */}
      <View style={styles.portraitIO}>
        <IOPanel
          digitalInputs={interpreterState.io.DI}
          digitalOutputs={interpreterState.io.DO}
          registers={interpreterState.registers.PR}
          onDigitalInputChange={(idx, val) => {
            useAppStore.getState().setDigitalInput(idx, val);
          }}
        />
      </View>

      {/* Console */}
      <View style={styles.portraitConsole}>
        <ExecutionConsole
          logs={executionLogs}
          currentLineNumber={interpreterState.programCounter}
          autoScroll={true}
        />
      </View>
    </View>
  );
};

/**
 * Main App Component
 */
export default function App() {
  useRestorePersistedState();
  useAutoSaveState(1000);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <SafeAreaView style={styles.safeArea}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      )}
      {isLandscape ? <LandscapeLayout /> : <PortraitLayout />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  // Landscape layout
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  leftPanel: {
    flex: 1,
    flexDirection: 'column',
  },
  rightPanel: {
    flex: 1,
    flexDirection: 'column',
  },
  editorSection: {
    flex: 1.2,
  },
  viewportSection: {
    flex: 0.8,
  },

  // Portrait layout
  portraitContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  portraitEditor: {
    flex: 1.5,
  },
  portraitViewport: {
    flex: 0.8,
  },
  portraitIO: {
    flex: 0.8,
  },
  portraitConsole: {
    flex: 1,
  },
});
