/**
 * Main Application Component
 * FANUC iOS Teach Pendant MVP — editorial night chrome
 */

import { Component, useCallback, type ErrorInfo, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Text,
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
import { theme, type } from './theme';
import type { InterpreterState } from './utils/interpreter';

class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('3D viewport failed; using 2D fallback', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function SceneViewport({ interpreterState }: { interpreterState: InterpreterState }) {
  return (
    <SceneErrorBoundary
      fallback={
        <Viewport3D
          currentPosition={interpreterState.currentPosition}
          isLoading={false}
        />
      }
    >
      <RobotArmViewer
        joints={interpreterState.currentJoints}
        currentPosition={interpreterState.currentPosition}
      />
    </SceneErrorBoundary>
  );
}

function Masthead() {
  return (
    <View style={styles.masthead}>
      <Text style={type.wordmark}>LR Mate 200iD</Text>
      <Text style={styles.mastheadSub}>Teach</Text>
    </View>
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

  const viewport = (
    <View style={isLandscape ? styles.hero : styles.portraitHero}>
      <Text style={[type.label, styles.heroLabel]}>Arm</Text>
      <SceneViewport interpreterState={interpreterState} />
    </View>
  );

  const rail = (
    <View style={isLandscape ? styles.rail : styles.portraitRail}>
      <Masthead />
      <LessonPicker onLoadLesson={loadLesson} />
      <View style={isLandscape ? styles.editorSection : styles.portraitEditor}>
        <Text style={[type.label, styles.sectionLabel]}>Program</Text>
        <CodeEditor
          value={program}
          onChange={setProgram}
          readOnly={isRunning && !isPaused}
          currentLine={currentLine}
        />
      </View>
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
      <View style={isLandscape ? styles.dataSection : styles.portraitIO}>
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
      </View>
      <View style={isLandscape ? styles.logSection : styles.portraitConsole}>
        <ExecutionConsole
          logs={executionLogs}
          currentLineNumber={currentLine ?? undefined}
          autoScroll={true}
        />
      </View>
    </View>
  );

  if (isLandscape) {
    return (
      <View style={styles.landscape}>
        {viewport}
        {rail}
      </View>
    );
  }

  return (
    <View style={styles.portrait}>
      {viewport}
      {rail}
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
  landscape: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.bg,
  },
  portrait: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: theme.bg,
  },
  hero: {
    flex: 1.65,
    backgroundColor: theme.bg,
    minWidth: 280,
  },
  portraitHero: {
    flex: 1.15,
    minHeight: 220,
    backgroundColor: theme.bg,
  },
  heroLabel: {
    position: 'absolute',
    top: 16,
    left: 20,
    zIndex: 2,
  },
  rail: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: theme.rule,
    backgroundColor: theme.panel,
    minWidth: 320,
  },
  portraitRail: {
    flex: 1.35,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.rule,
    backgroundColor: theme.panel,
  },
  masthead: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 4,
  },
  mastheadSub: {
    color: theme.muted,
    fontSize: 11,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  sectionLabel: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
  },
  editorSection: {
    flex: 1.15,
  },
  dataSection: {
    flex: 0.85,
  },
  logSection: {
    flex: 0.55,
    minHeight: 88,
  },
  portraitEditor: {
    flex: 1.1,
  },
  portraitIO: {
    flex: 0.75,
  },
  portraitConsole: {
    flex: 0.55,
    minHeight: 72,
  },
});
