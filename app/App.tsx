/**
 * Main Application Component
 * FANUC iOS Teach Pendant MVP
 */

import { useCallback } from 'react';
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
import { LessonPicker } from './components/LessonPicker';
import { editorHighlightIndex } from './editor/programCounter';
import { theme } from './theme';
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

function PendantScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
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
    loadLesson,
    definePosition,
    teachCurrentPosition,
  } = useAppStore();

  const highlightActive = isRunning || isPaused || Boolean(lastError);
  const currentLine = editorHighlightIndex(
    interpreterState.programCounter,
    highlightActive,
    Math.max(program.split('\n').length, 1)
  );

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
    const line = interpreterState.programCounter;
    if (line >= 0) {
      addBreakpoint(line);
    }
  }, [interpreterState.programCounter, addBreakpoint]);

  const editor = (
    <View style={isLandscape ? styles.editorSection : styles.portraitEditor}>
      <LessonPicker onLoadLesson={loadLesson} />
      <CodeEditor
        value={program}
        onChange={setProgram}
        readOnly={isRunning && !isPaused}
        currentLine={currentLine}
      />
    </View>
  );

  const viewport = (
    <View style={isLandscape ? styles.viewportSection : styles.portraitViewport}>
      <SceneViewport interpreterState={interpreterState} />
    </View>
  );

  const controls = (
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
  );

  const io = (
    <IOPanel
      digitalInputs={interpreterState.io.DI}
      digitalOutputs={interpreterState.io.DO}
      registers={interpreterState.registers.PR}
      onDigitalInputChange={(idx, val) => {
        useAppStore.getState().setDigitalInput(idx, val);
      }}
      positions={interpreterState.positions}
      currentPosition={interpreterState.currentPosition}
      onDefinePosition={definePosition}
      onTeachCurrent={teachCurrentPosition}
    />
  );

  const consolePanel = (
    <ExecutionConsole
      logs={executionLogs}
      currentLineNumber={currentLine ?? undefined}
      autoScroll={true}
    />
  );

  if (isLandscape) {
    return (
      <View style={styles.landscapeContainer}>
        <View style={styles.leftPanel}>
          {editor}
          {viewport}
        </View>
        <View style={styles.rightPanel}>
          {controls}
          <View style={styles.flexFill}>{io}</View>
          <View style={styles.flexFill}>{consolePanel}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.portraitContainer}>
      {editor}
      {viewport}
      {controls}
      <View style={styles.portraitIO}>{io}</View>
      <View style={styles.portraitConsole}>{consolePanel}</View>
    </View>
  );
}

export default function App() {
  useRestorePersistedState();
  useAutoSaveState(1000);

  return (
    <SafeAreaView style={styles.safeArea}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      )}
      <PendantScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.bg,
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
    minHeight: 240,
  },
  flexFill: {
    flex: 1,
  },
  portraitContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  portraitEditor: {
    flex: 1.5,
  },
  portraitViewport: {
    flex: 0.8,
    minHeight: 240,
  },
  portraitIO: {
    flex: 0.8,
  },
  portraitConsole: {
    flex: 1,
  },
});
