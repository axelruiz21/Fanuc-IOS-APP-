/**
 * FANUC TP Language Interpreter
 * Phase 1: Complete Parser & Virtual Machine
 * Production-ready TypeScript implementation
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * 6D Position in FANUC coordinate system (mm, degrees)
 */
export interface Position {
  x: number;
  y: number;
  z: number;
  rx: number; // Rotation X
  ry: number; // Rotation Y
  rz: number; // Rotation Z
}

/**
 * I/O State: Digital Inputs (DI) and Outputs (DO)
 */
export interface IOState {
  DI: Record<number, boolean>;  // Digital Inputs (1-32)
  DO: Record<number, boolean>;  // Digital Outputs (1-32)
}

/**
 * Numeric Registers (PR[1..100])
 */
export interface Registers {
  PR: Record<number, number>;
}

/**
 * Complete interpreter state
 */
export interface InterpreterState {
  positions: Record<number, Position>;      // P[1..100]
  registers: Registers;                      // PR[1..100]
  io: IOState;                               // DI/DO
  currentPosition: Position | null;          // Last moved-to position
  programCounter: number;                    // Current line
  callStack: number[];                       // For nested calls
  isRunning: boolean;
  isPaused: boolean;
  breakPoints: Set<number>;
}

/**
 * Execution result returned to UI
 */
export interface ExecutionResult {
  success: boolean;
  error?: string;
  state: InterpreterState;
  executionLog: string[];
  nextLineNumber?: number;
  currentLine?: string;
  elapsedMs: number;
}

/**
 * Parsed token from a line
 */
interface Token {
  type: 'COMMAND' | 'IDENTIFIER' | 'NUMBER' | 'OPERATOR' | 'PUNCTUATION' | 'STRING';
  value: string;
  lineNumber: number;
}

/**
 * Parsed AST node
 */
interface ASTNode {
  type: string;
  lineNumber: number;
  content?: string;
  [key: string]: any;
}

/**
 * Command execution context
 */
interface LoopFrame {
  headerLine: number;
  bodyStart: number;
  variable: string;
  current: number;
  end: number;
  registerIndex: number;
}

interface ExecutionContext {
  state: InterpreterState;
  lines: string[];
  log: string[];
  stopExecution: boolean;
  pauseUntil?: number;
  didJump: boolean;
  loopStack: LoopFrame[];
  /** Resume must execute the paused line; skip the breakpoint check once. */
  skipBreakpointOnce?: boolean;
}

// ============================================================================
// FANUC INTERPRETER CLASS
// ============================================================================

export class FANUCInterpreter {
  private state: InterpreterState;
  private context: ExecutionContext | null = null;

  constructor() {
    this.state = this.initializeState();
  }

  /**
   * Initialize fresh interpreter state
   */
  private initializeState(): InterpreterState {
    const state: InterpreterState = {
      positions: {},
      registers: { PR: {} },
      io: { DI: {}, DO: {} },
      currentPosition: null,
      programCounter: 0,
      callStack: [],
      isRunning: false,
      isPaused: false,
      breakPoints: new Set(),
    };

    // Initialize all positions to origin
    for (let i = 1; i <= 100; i++) {
      state.positions[i] = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    }

    // Initialize all registers to 0
    for (let i = 1; i <= 100; i++) {
      state.registers.PR[i] = 0;
    }

    // Initialize all I/O to false
    for (let i = 1; i <= 32; i++) {
      state.io.DI[i] = false;
      state.io.DO[i] = false;
    }

    return state;
  }

  /**
   * Define a teaching position
   */
  public definePosition(index: number, pos: Position): void {
    if (index < 1 || index > 100) {
      throw new Error(`Position index must be 1-100, got ${index}`);
    }
    this.state.positions[index] = { ...pos };
  }

  /**
   * Get current position
   */
  public getPosition(index: number): Position {
    if (index < 1 || index > 100) {
      throw new Error(`Position index must be 1-100, got ${index}`);
    }
    return { ...this.state.positions[index] };
  }

  /**
   * Set digital input (for simulation)
   */
  public setDigitalInput(index: number, value: boolean): void {
    if (index < 1 || index > 32) {
      throw new Error(`DI index must be 1-32, got ${index}`);
    }
    this.state.io.DI[index] = value;
  }

  /**
   * Get digital output state
   */
  public getDigitalOutput(index: number): boolean {
    if (index < 1 || index > 32) {
      throw new Error(`DO index must be 1-32, got ${index}`);
    }
    return this.state.io.DO[index];
  }

  /**
   * Set numeric register
   */
  public setRegister(index: number, value: number): void {
    if (index < 1 || index > 100) {
      throw new Error(`PR index must be 1-100, got ${index}`);
    }
    this.state.registers.PR[index] = value;
  }

  /**
   * Get numeric register
   */
  public getRegister(index: number): number {
    if (index < 1 || index > 100) {
      throw new Error(`PR index must be 1-100, got ${index}`);
    }
    return this.state.registers.PR[index];
  }

  /**
   * Add breakpoint at line number
   */
  public addBreakPoint(lineNumber: number): void {
    this.state.breakPoints.add(lineNumber);
  }

  /**
   * Remove breakpoint
   */
  public removeBreakPoint(lineNumber: number): void {
    this.state.breakPoints.delete(lineNumber);
  }

  /**
   * Get current state
   */
  public getState(): InterpreterState {
    return {
      positions: Object.fromEntries(
        Object.entries(this.state.positions).map(([k, v]) => [k, { ...v }])
      ),
      registers: { PR: { ...this.state.registers.PR } },
      io: { DI: { ...this.state.io.DI }, DO: { ...this.state.io.DO } },
      currentPosition: this.state.currentPosition ? { ...this.state.currentPosition } : null,
      programCounter: this.state.programCounter,
      callStack: [...this.state.callStack],
      isRunning: this.state.isRunning,
      isPaused: this.state.isPaused,
      breakPoints: new Set(this.state.breakPoints),
    };
  }

  /**
   * Reset to initial state
   */
  public reset(): void {
    this.state = this.initializeState();
    this.context = null;
  }

  /**
   * Parse and execute a FANUC program
   */
  public async execute(program: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Preprocess: clean and tokenize
      const lines = this.preprocessProgram(program);
      if (lines.length === 0) {
        return {
          success: true,
          state: this.getState(),
          executionLog: ['Program empty'],
          elapsedMs: Date.now() - startTime,
        };
      }

      // Initialize execution context
      this.context = {
        state: this.state,
        lines,
        log: [],
        stopExecution: false,
        didJump: false,
        loopStack: [],
      };
      this.state.isRunning = true;
      this.state.isPaused = false;
      this.state.programCounter = 0;
      return await this.runLoop(startTime);
    } catch (err) {
      this.state.isRunning = false;
      return {
        success: false,
        error: (err as Error).message,
        state: this.getState(),
        executionLog: this.context?.log ?? [],
        elapsedMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Step to next line (debugger)
   */
  public async step(): Promise<ExecutionResult> {
    if (!this.context) {
      return {
        success: false,
        error: 'No program running',
        state: this.getState(),
        executionLog: [],
        elapsedMs: 0,
      };
    }

    const startTime = Date.now();

    try {
      const line = this.context.lines[this.state.programCounter] ?? '';
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith(';')) {
        this.state.programCounter++;
        this.context.log.push(`[STEP] Skipped empty/comment at line ${this.state.programCounter}`);
      } else {
        await this.executeLine(trimmed, this.state.programCounter);
        this.state.programCounter++;
      }

      return {
        success: true,
        state: this.getState(),
        executionLog: this.context.log,
        nextLineNumber: this.state.programCounter,
        currentLine: this.context.lines[this.state.programCounter] ?? 'END',
        elapsedMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
        state: this.getState(),
        executionLog: this.context.log,
        elapsedMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Continue execution after pause
   */
  public async continue(): Promise<ExecutionResult> {
    if (!this.context) {
      return {
        success: false,
        error: 'No program running',
        state: this.getState(),
        executionLog: [],
        elapsedMs: 0,
      };
    }

    this.state.isPaused = false;
    if (this.state.breakPoints.has(this.state.programCounter)) {
      this.context.skipBreakpointOnce = true;
    }
    return this.runLoop(Date.now());
  }

  /**
   * Pause execution
   */
  public pause(): void {
    this.state.isPaused = true;
  }

  // ============================================================================
  // PRIVATE METHODS: PARSING & EXECUTION
  // ============================================================================

  /**
   * Preprocess program: remove metadata, keep blanks and comments
   */
  private preprocessProgram(program: string): string[] {
    return program.split('\n').filter((raw) => {
      const t = raw.trim().toUpperCase();
      if (t.startsWith('/PROG') || t.startsWith('/BODY') || t.startsWith('/ATTR')) return false;
      if (t.startsWith('/COMMENT') || t.startsWith('/ACCESS') || t.startsWith('/REL') || t.startsWith('/PTP')) return false;
      return true;
    });
  }

  private async runLoop(startTime: number): Promise<ExecutionResult> {
    if (!this.context) {
      throw new Error('No execution context');
    }

    this.state.isRunning = true;

    while (
      this.state.programCounter < this.context.lines.length &&
      !this.context.stopExecution &&
      !this.state.isPaused
    ) {
      const lineNumber = this.state.programCounter;
      const line = this.context.lines[lineNumber] ?? '';
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith(';')) {
        this.state.programCounter++;
        continue;
      }

      if (this.state.breakPoints.has(lineNumber) && !this.context.skipBreakpointOnce) {
        this.context.log.push(`[BREAKPOINT] Line ${lineNumber}: ${trimmed}`);
        this.state.isPaused = true;
        break;
      }
      this.context.skipBreakpointOnce = false;

      this.context.didJump = false;
      try {
        await this.executeLine(trimmed, lineNumber);
      } catch (err) {
        throw new Error(`Line ${lineNumber}: ${(err as Error).message}`);
      }

      if (this.context.stopExecution || this.state.isPaused) {
        break;
      }

      if (!this.context.didJump) {
        this.state.programCounter++;
      }
    }

    this.state.isRunning = false;
    return {
      success: true,
      state: this.getState(),
      executionLog: this.context.log,
      nextLineNumber: this.state.programCounter,
      currentLine:
        this.state.programCounter < this.context.lines.length
          ? this.context.lines[this.state.programCounter]
          : 'END',
      elapsedMs: Date.now() - startTime,
    };
  }

  /**
   * Execute a single line
   */
  private async executeLine(line: string, lineNumber: number): Promise<void> {
    if (!this.context) throw new Error('No execution context');

    const log = this.context.log;
    const tokens = this.tokenize(line);

    if (tokens.length === 0) return;

    const command = tokens[0].value.toUpperCase();

    switch (command) {
      case 'MOVE':
        this.executeMOVE(tokens, lineNumber);
        break;
      case 'J':
        this.executeJ(tokens, lineNumber);
        break;
      case 'L':
        this.executeL(tokens, lineNumber);
        break;
      case 'DOUT':
        this.executeDOUT(tokens, lineNumber);
        break;
      case 'WAIT':
        await this.executeWAIT(tokens, lineNumber);
        break;
      case 'IF':
        this.executeIF(tokens, lineNumber, line);
        break;
      case 'THEN':
        break;
      case 'ELSE': {
        const { endifLine } = this.findMatchingElseOrEndif(lineNumber + 1);
        this.state.programCounter = endifLine + 1;
        this.context.didJump = true;
        log.push(`[${lineNumber}] ELSE`);
        break;
      }
      case 'FOR':
        this.executeFOR(tokens, lineNumber, line);
        break;
      case 'END':
        log.push(`[${lineNumber}] ${command}`);
        this.context.stopExecution = true;
        break;
      case 'ENDIF':
        log.push(`[${lineNumber}] ENDIF`);
        break;
      case 'ENDFOR': {
        const frame = this.context.loopStack[this.context.loopStack.length - 1];
        if (!frame) throw new Error('ENDFOR without FOR');
        frame.current += 1;
        this.state.registers.PR[frame.registerIndex] = frame.current;
        if (frame.current <= frame.end) {
          this.state.programCounter = frame.bodyStart;
          this.context.didJump = true;
        } else {
          this.context.loopStack.pop();
        }
        log.push(`[${lineNumber}] ENDFOR`);
        break;
      }
      case 'CALL':
        this.executeCALL(tokens, lineNumber);
        break;
      default:
        // Try to parse as register assignment
        if (line.includes('=')) {
          this.executeAssignment(line, lineNumber);
        } else {
          throw new Error(`Unknown command: ${command}`);
        }
    }
  }

  /**
   * Tokenize a line into tokens
   */
  private tokenize(line: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < line.length) {
      // Skip whitespace
      if (/\s/.test(line[i])) {
        i++;
        continue;
      }

      // Comments
      if (line[i] === ';') break;

      // Numbers
      if (
        /\d/.test(line[i]) ||
        (line[i] === '.' && /\d/.test(line[i + 1] ?? '')) ||
        (line[i] === '-' && /\d/.test(line[i + 1] ?? ''))
      ) {
        let numStr = '';
        if (line[i] === '-') numStr += line[i++];
        while (i < line.length && (/\d/.test(line[i]) || line[i] === '.')) {
          numStr += line[i++];
        }
        tokens.push({ type: 'NUMBER', value: numStr, lineNumber: 0 });
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_]/.test(line[i])) {
        let ident = '';
        while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
          ident += line[i++];
        }
        const isCommand = ['MOVE', 'J', 'L', 'DOUT', 'WAIT', 'IF', 'FOR', 'END', 'ENDIF', 'ENDFOR', 'THEN', 'ELSE', 'CALL', 'ON', 'OFF', 'TO', 'DIN'].includes(ident.toUpperCase());
        tokens.push({ type: isCommand ? 'COMMAND' : 'IDENTIFIER', value: ident, lineNumber: 0 });
        continue;
      }

      // Operators
      if ('=<>!'.includes(line[i])) {
        let op = line[i];
        i++;
        if (i < line.length && '=<>'.includes(line[i])) {
          op += line[i++];
        }
        tokens.push({ type: 'OPERATOR', value: op, lineNumber: 0 });
        continue;
      }

      // Punctuation
      if ('()[]{}:,+-*/%'.includes(line[i])) {
        tokens.push({ type: 'PUNCTUATION', value: line[i], lineNumber: 0 });
        i++;
        continue;
      }

      i++;
    }

    return tokens;
  }

  /**
   * Parse position reference P[n]
   */
  private parsePositionRef(tokens: Token[], startIdx: number): { index: number; nextIdx: number } {
    const token = tokens[startIdx];
    if (token.value.toUpperCase() === 'P') {
      const bracketToken = tokens[startIdx + 1];
      if (bracketToken?.value === '[') {
        const refToken = tokens[startIdx + 2];
        const closeBracket = tokens[startIdx + 3];
        if (refToken?.type === 'NUMBER' && closeBracket?.value === ']') {
          const index = parseInt(refToken.value, 10);
          if (index < 1 || index > 100) {
            throw new Error(`Position index must be 1-100, got ${index}`);
          }
          return { index, nextIdx: startIdx + 4 };
        }
        if (
          (refToken?.type === 'IDENTIFIER' || refToken?.type === 'COMMAND') &&
          refToken.value.toUpperCase() === 'J' &&
          closeBracket?.value === ']'
        ) {
          const index = this.state.registers.PR[1] ?? 1;
          if (index < 1 || index > 100) {
            throw new Error(`Position index must be 1-100, got ${index}`);
          }
          return { index, nextIdx: startIdx + 4 };
        }
        if (refToken?.value.toUpperCase() === 'PR') {
          const innerBracket = tokens[startIdx + 3];
          const numToken = tokens[startIdx + 4];
          const outerClose = tokens[startIdx + 5];
          if (innerBracket?.value === '[' && numToken?.type === 'NUMBER' && outerClose?.value === ']') {
            const regIndex = parseInt(numToken.value, 10);
            const index = this.state.registers.PR[regIndex] ?? 1;
            if (index < 1 || index > 100) {
              throw new Error(`Position index must be 1-100, got ${index}`);
            }
            return { index, nextIdx: startIdx + 6 };
          }
        }
      }
    }
    throw new Error(`Invalid position reference at token ${startIdx}`);
  }

  /**
   * Parse register reference PR[n]
   */
  private parseRegisterRef(tokens: Token[], startIdx: number): { index: number; nextIdx: number } {
    const token = tokens[startIdx];
    if (token.value.toUpperCase() === 'PR') {
      const bracketToken = tokens[startIdx + 1];
      if (bracketToken?.value === '[') {
        const numToken = tokens[startIdx + 2];
        const closeBracket = tokens[startIdx + 3];
        if (numToken?.type === 'NUMBER' && closeBracket?.value === ']') {
          const index = parseInt(numToken.value, 10);
          if (index < 1 || index > 100) {
            throw new Error(`PR index must be 1-100, got ${index}`);
          }
          return { index, nextIdx: startIdx + 4 };
        }
      }
    }
    throw new Error(`Invalid register reference at token ${startIdx}`);
  }

  /**
   * Parse I/O reference DI[n] or DO[n]
   */
  private parseIORef(tokens: Token[], startIdx: number): { type: 'DI' | 'DO'; index: number; nextIdx: number } {
    const token = tokens[startIdx];
    const ioType = token.value.toUpperCase() as 'DI' | 'DO';

    if (!['DI', 'DO'].includes(ioType)) {
      throw new Error(`Invalid I/O reference: ${token.value}`);
    }

    const bracketToken = tokens[startIdx + 1];
    if (bracketToken?.value === '[') {
      const numToken = tokens[startIdx + 2];
      const closeBracket = tokens[startIdx + 3];
      if (numToken?.type === 'NUMBER' && closeBracket?.value === ']') {
        const index = parseInt(numToken.value, 10);
        if (index < 1 || index > 32) {
          throw new Error(`I/O index must be 1-32, got ${index}`);
        }
        return { type: ioType, index, nextIdx: startIdx + 4 };
      }
    }
    throw new Error(`Invalid I/O reference at token ${startIdx}`);
  }

  /**
   * MOVE P[n] command
   */
  private executeMOVE(tokens: Token[], lineNumber: number): void {
    if (!this.context) throw new Error('No execution context');

    try {
      const { index } = this.parsePositionRef(tokens, 1);
      const position = this.state.positions[index];

      this.state.currentPosition = { ...position };
      this.context.log.push(`[${lineNumber}] MOVE P[${index}] -> X:${position.x} Y:${position.y} Z:${position.z}`);
    } catch (err) {
      throw new Error(`MOVE: ${(err as Error).message}`);
    }
  }

  /**
   * J P[n] speed% command (joint move)
   */
  private executeJ(tokens: Token[], lineNumber: number): void {
    if (!this.context) throw new Error('No execution context');

    try {
      const { index, nextIdx } = this.parsePositionRef(tokens, 1);
      const speedToken = tokens[nextIdx];
      const speed = speedToken?.type === 'NUMBER' ? parseInt(speedToken.value, 10) : 100;

      const position = this.state.positions[index];
      this.state.currentPosition = { ...position };
      this.context.log.push(`[${lineNumber}] J P[${index}] ${speed}% -> X:${position.x} Y:${position.y} Z:${position.z}`);
    } catch (err) {
      throw new Error(`J: ${(err as Error).message}`);
    }
  }

  /**
   * L P[n] speed mm/s command (linear move)
   */
  private executeL(tokens: Token[], lineNumber: number): void {
    if (!this.context) throw new Error('No execution context');

    try {
      const { index, nextIdx } = this.parsePositionRef(tokens, 1);
      const speedToken = tokens[nextIdx];
      const speed = speedToken?.type === 'NUMBER' ? parseInt(speedToken.value, 10) : 500;

      const position = this.state.positions[index];
      this.state.currentPosition = { ...position };
      this.context.log.push(`[${lineNumber}] L P[${index}] ${speed}mm/s -> X:${position.x} Y:${position.y} Z:${position.z}`);
    } catch (err) {
      throw new Error(`L: ${(err as Error).message}`);
    }
  }

  /**
   * DOUT OT[n]=ON/OFF command
   */
  private executeDOUT(tokens: Token[], lineNumber: number): void {
    if (!this.context) throw new Error('No execution context');

    try {
      // Parse OT[n]=value
      if (tokens[1]?.value.toUpperCase() !== 'OT') {
        throw new Error('Expected OT[n]');
      }

      const bracketIdx = tokens.findIndex((t, i) => i > 1 && t.value === '[');
      if (bracketIdx === -1) throw new Error('Invalid syntax');

      const numToken = tokens[bracketIdx + 1];
      const closeBracketIdx = tokens.findIndex((t, i) => i > bracketIdx && t.value === ']');
      if (!numToken?.type || numToken.type !== 'NUMBER' || closeBracketIdx === -1) {
        throw new Error('Invalid OT[n] syntax');
      }

      const outputIndex = parseInt(numToken.value, 10);
      if (outputIndex < 1 || outputIndex > 32) {
        throw new Error(`DO index must be 1-32, got ${outputIndex}`);
      }
      const eqIdx = tokens.findIndex((t, i) => i > closeBracketIdx && t.value === '=');
      if (eqIdx === -1) throw new Error('Expected =');

      const valueToken = tokens[eqIdx + 1];
      const value = valueToken?.value.toUpperCase() === 'ON';

      this.state.io.DO[outputIndex] = value;
      this.context.log.push(`[${lineNumber}] DOUT OT[${outputIndex}]=${value ? 'ON' : 'OFF'}`);
    } catch (err) {
      throw new Error(`DOUT: ${(err as Error).message}`);
    }
  }

  /**
   * WAIT n.n or WAIT DIN(DI[n]) command
   */
  private async sleep(ms: number): Promise<void> {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (this.state.isPaused || this.context?.stopExecution) return;
      await new Promise<void>((resolve) => setTimeout(resolve, Math.min(20, end - Date.now())));
    }
  }

  private async executeWAIT(tokens: Token[], lineNumber: number): Promise<void> {
    if (!this.context) throw new Error('No execution context');

    const secondToken = tokens[1];
    if (secondToken?.type === 'NUMBER') {
      const seconds = parseFloat(secondToken.value);
      this.context.log.push(`[${lineNumber}] WAIT ${seconds}s`);
      await this.sleep(seconds * 1000);
      return;
    }

    if (secondToken?.value.toUpperCase() === 'DIN') {
      const { index } = this.parseIORef(tokens, tokens.findIndex((t) => t.value.toUpperCase() === 'DI'));
      this.context.log.push(`[${lineNumber}] WAIT DIN(DI[${index}])`);
      while (!this.state.io.DI[index] && !this.state.isPaused && !this.context.stopExecution) {
        await this.sleep(100);
      }
      return;
    }

    throw new Error('WAIT expects seconds or DIN(DI[n])');
  }

  private findMatchingElseOrEndif(from: number): { elseLine: number | null; endifLine: number } {
    if (!this.context) throw new Error('No execution context');
    let elseLine: number | null = null;
    for (let i = from; i < this.context.lines.length; i++) {
      const cmd = this.context.lines[i].trim().toUpperCase();
      if (cmd === 'ELSE' || cmd.startsWith('ELSE ')) {
        elseLine = i;
      }
      if (cmd === 'ENDIF' || cmd.startsWith('ENDIF ')) {
        return { elseLine, endifLine: i };
      }
    }
    throw new Error('Missing ENDIF');
  }

  /**
   * IF condition THEN ... ELSE ... ENDIF
   */
  private executeIF(_tokens: Token[], lineNumber: number, fullLine: string): void {
    if (!this.context) throw new Error('No execution context');
    const open = fullLine.indexOf('(');
    const close = fullLine.lastIndexOf(')');
    if (open === -1 || close === -1) throw new Error('IF requires (condition)');
    const conditionStr = fullLine.substring(open + 1, close);
    const conditionResult = this.evaluateCondition(conditionStr);
    this.context.log.push(`[${lineNumber}] IF (${conditionStr}) = ${conditionResult}`);
    const { elseLine, endifLine } = this.findMatchingElseOrEndif(lineNumber + 1);
    if (conditionResult) {
      this.context.didJump = false;
    } else {
      this.state.programCounter = elseLine !== null ? elseLine + 1 : endifLine + 1;
      this.context.didJump = true;
    }
  }

  /**
   * FOR J=start TO end ... ENDFOR
   */
  private executeFOR(_tokens: Token[], lineNumber: number, fullLine: string): void {
    if (!this.context) throw new Error('No execution context');
    const forMatch = fullLine.match(/FOR\s+(\w+)\s*=\s*(-?\d+)\s+TO\s*(-?\d+)/i);
    if (!forMatch) throw new Error('Invalid FOR syntax');
    const variable = forMatch[1].toUpperCase();
    const start = parseInt(forMatch[2], 10);
    const end = parseInt(forMatch[3], 10);
    const registerIndex = variable === 'J' || !/\d/.test(variable) ? 1 : parseInt(variable.replace(/\D/g, ''), 10);
    this.state.registers.PR[registerIndex] = start;
    this.context.loopStack.push({
      headerLine: lineNumber,
      bodyStart: lineNumber + 1,
      variable,
      current: start,
      end,
      registerIndex,
    });
    this.context.log.push(`[${lineNumber}] FOR ${variable}=${start} TO ${end}`);
  }

  /**
   * CALL program_name
   */
  private executeCALL(tokens: Token[], lineNumber: number): void {
    if (!this.context) throw new Error('No execution context');

    throw new Error('CALL is not implemented in this MVP');
  }

  /**
   * Parse and execute register/variable assignment
   */
  private executeAssignment(line: string, lineNumber: number): void {
    if (!this.context) throw new Error('No execution context');

    try {
      const [lhs, rhs] = line.split('=').map((s) => s.trim());

      // PR[n] = value
      const prMatch = lhs.match(/PR\[(\d+)\]/i);
      if (prMatch) {
        const regIdx = parseInt(prMatch[1], 10);
        const value = this.evaluateExpression(rhs);
        this.state.registers.PR[regIdx] = value;
        this.context.log.push(`[${lineNumber}] PR[${regIdx}] = ${value}`);
        return;
      }

      throw new Error(`Unknown assignment target: ${lhs}`);
    } catch (err) {
      throw new Error(`Assignment: ${(err as Error).message}`);
    }
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(condition: string): boolean {
    const trimmed = condition.trim();

    // DI[n]=ON/OFF
    const diMatch = trimmed.match(/DI\[(\d+)\]\s*=\s*(ON|OFF)/i);
    if (diMatch) {
      const index = parseInt(diMatch[1], 10);
      const expectedValue = diMatch[2].toUpperCase() === 'ON';
      return this.state.io.DI[index] === expectedValue;
    }

    // PR[n]>value, PR[n]<value, PR[n]=value
    const prMatch = trimmed.match(/PR\[(\d+)\]\s*(>|<|=|>=|<=)\s*(\d+)/i);
    if (prMatch) {
      const index = parseInt(prMatch[1], 10);
      const operator = prMatch[2];
      const value = parseInt(prMatch[3], 10);
      const regValue = this.state.registers.PR[index];

      switch (operator) {
        case '>':
          return regValue > value;
        case '<':
          return regValue < value;
        case '=':
          return regValue === value;
        case '>=':
          return regValue >= value;
        case '<=':
          return regValue <= value;
        default:
          return false;
      }
    }

    throw new Error(`Cannot evaluate condition: ${condition}`);
  }

  /**
   * Evaluate an expression
   */
  private evaluateExpression(expr: string): number {
    const trimmed = expr.trim();

    // Direct number
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    const twoPr = trimmed.match(/PR\[(\d+)\]\s*([+\-*/])\s*PR\[(\d+)\]/i);
    if (twoPr) {
      const left = this.state.registers.PR[parseInt(twoPr[1], 10)] ?? 0;
      const right = this.state.registers.PR[parseInt(twoPr[3], 10)] ?? 0;
      return this.applyArith(left, twoPr[2], right);
    }

    const onePr = trimmed.match(/PR\[(\d+)\]\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)/i);
    if (onePr) {
      const left = this.state.registers.PR[parseInt(onePr[1], 10)] ?? 0;
      return this.applyArith(left, onePr[2], parseFloat(onePr[3]));
    }

    // PR[n] reference
    const prMatch = trimmed.match(/PR\[(\d+)\]/i);
    if (prMatch) {
      return this.state.registers.PR[parseInt(prMatch[1], 10)] ?? 0;
    }

    throw new Error(`Cannot evaluate expression: ${expr}`);
  }

  private applyArith(left: number, op: string, right: number): number {
    if (op === '/' && right === 0) throw new Error('Division by zero');
    if (op === '+') return left + right;
    if (op === '-') return left - right;
    if (op === '*') return left * right;
    if (op === '/') return left / right;
    throw new Error(`Unknown operator ${op}`);
  }
}

// ============================================================================
// EXAMPLE USAGE & EXPORTS
// ============================================================================

/**
 * Example usage (remove in production)
 */
export async function exampleUsage() {
  const vm = new FANUCInterpreter();

  // Define teaching positions
  vm.definePosition(1, { x: 100, y: 200, z: 300, rx: 0, ry: 0, rz: 0 });
  vm.definePosition(2, { x: 150, y: 250, z: 350, rx: 45, ry: 0, rz: 0 });
  vm.definePosition(3, { x: 200, y: 300, z: 400, rx: 0, ry: 45, rz: 0 });

  // Sample program
  const program = `
; FANUC Teach Pendant Program
MOVE P[1]
DOUT OT[1]=ON
WAIT 1.0
MOVE P[2]
DOUT OT[1]=OFF
WAIT 0.5
MOVE P[3]
PR[1]=100
IF (PR[1]>50)
  DOUT OT[2]=ON
ENDIF
WAIT 2.0
END
`;

  const result = await vm.execute(program);

  console.log('=== EXECUTION RESULT ===');
  console.log('Success:', result.success);
  console.log('Elapsed:', result.elapsedMs, 'ms');
  console.log('\n=== EXECUTION LOG ===');
  result.executionLog.forEach((log) => console.log(log));
  console.log('\n=== FINAL STATE ===');
  console.log('Current Position:', result.state.currentPosition);
  console.log('DO[1]:', result.state.io.DO[1]);
  console.log('DO[2]:', result.state.io.DO[2]);
  console.log('PR[1]:', result.state.registers.PR[1]);
}

// Run example (comment out in production)
// exampleUsage().catch(console.error);
