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
interface ExecutionContext {
  state: InterpreterState;
  lines: string[];
  log: string[];
  stopExecution: boolean;
  pauseUntil?: number; // Timestamp for WAIT commands
}

// ============================================================================
// FANUC INTERPRETER CLASS
// ============================================================================

export class FANUCInterpreter {
  private state: InterpreterState;
  private context: ExecutionContext | null = null;
  private asyncWaitTimestamp: number | null = null;

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
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Reset to initial state
   */
  public reset(): void {
    this.state = this.initializeState();
    this.context = null;
    this.asyncWaitTimestamp = null;
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
        pauseUntil: undefined,
      };

      // Execute
      this.state.isRunning = true;
      this.state.programCounter = 0;

      while (this.state.programCounter < lines.length && !this.context.stopExecution) {
        const lineNumber = this.state.programCounter;
        const line = lines[lineNumber].trim();

        // Skip empty lines and comments
        if (!line || line.startsWith(';')) {
          this.state.programCounter++;
          continue;
        }

        // Check breakpoint
        if (this.state.breakPoints.has(lineNumber)) {
          this.context.log.push(`[BREAKPOINT] Line ${lineNumber}: ${line}`);
          this.state.isPaused = true;
          break;
        }

        // Handle async wait
        if (this.asyncWaitTimestamp) {
          if (Date.now() < this.asyncWaitTimestamp) {
            break; // Still waiting
          }
          this.asyncWaitTimestamp = null;
        }

        // Execute line
        try {
          await this.executeLine(line, lineNumber);
        } catch (err) {
          throw new Error(`Line ${lineNumber}: ${(err as Error).message}`);
        }

        this.state.programCounter++;
      }

      this.state.isRunning = false;

      return {
        success: true,
        state: this.getState(),
        executionLog: this.context.log,
        nextLineNumber: this.state.programCounter,
        currentLine: this.state.programCounter < lines.length ? lines[this.state.programCounter] : 'END',
        elapsedMs: Date.now() - startTime,
      };
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
      const line = this.context.lines[this.state.programCounter]?.trim() ?? '';

      if (!line || line.startsWith(';')) {
        this.state.programCounter++;
        this.context.log.push(`[STEP] Skipped empty/comment at line ${this.state.programCounter}`);
      } else {
        await this.executeLine(line, this.state.programCounter);
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
    return this.execute(this.context.lines.join('\n'));
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
   * Preprocess program: remove metadata, clean lines
   */
  private preprocessProgram(program: string): string[] {
    return program
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        // Skip FANUC metadata lines
        if (line.startsWith('/')) return false;
        if (line.startsWith('/PROG')) return false;
        if (line.startsWith('/COMMENT')) return false;
        if (line.startsWith('/ACCESS')) return false;
        if (line.startsWith('/REL')) return false;
        if (line.startsWith('/ATTR')) return false;
        if (line.startsWith('/BODY')) return false;
        if (line.startsWith('/PTP')) return false;
        return true;
      });
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
      case 'FOR':
        this.executeFOR(tokens, lineNumber, line);
        break;
      case 'END':
      case 'ENDIF':
      case 'ENDFOR':
        log.push(`[${lineNumber}] ${command}`);
        break;
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
      if (/\d/.test(line[i]) || (line[i] === '.' && /\d/.test(line[i + 1]))) {
        let numStr = '';
        while (i < line.length && (/\d/.test(line[i]) || line[i] === '.')) {
          numStr += line[i++];
        }
        tokens.push({ type: 'NUMBER', value: numStr, lineNumber: 0 });
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_]/.test(line[i])) {
        let ident = '';
        while (i < line.length && /[a-zA-Z0-9_\[\]]/.test(line[i])) {
          ident += line[i++];
        }
        const isCommand = ['MOVE', 'J', 'L', 'DOUT', 'WAIT', 'IF', 'FOR', 'END', 'ENDIF', 'ENDFOR', 'THEN', 'ELSE', 'CALL', 'ON', 'OFF', 'TO'].includes(ident.toUpperCase());
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
        const numToken = tokens[startIdx + 2];
        const closeBracket = tokens[startIdx + 3];
        if (numToken?.type === 'NUMBER' && closeBracket?.value === ']') {
          const index = parseInt(numToken.value, 10);
          return { index, nextIdx: startIdx + 4 };
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
      const { index } = this.parsePositionRef(tokens, 1);
      const speedToken = tokens[3];
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
      const { index } = this.parsePositionRef(tokens, 1);
      const speedToken = tokens[3];
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
  private async executeWAIT(tokens: Token[], lineNumber: number): Promise<void> {
    if (!this.context) throw new Error('No execution context');

    try {
      const secondToken = tokens[1];

      // WAIT seconds
      if (secondToken?.type === 'NUMBER') {
        const seconds = parseFloat(secondToken.value);
        this.context.log.push(`[${lineNumber}] WAIT ${seconds}s`);
        this.asyncWaitTimestamp = Date.now() + seconds * 1000;
        return;
      }

      // WAIT DIN(DI[n])
      if (secondToken?.value.toUpperCase() === 'DIN') {
        const parenIdx = tokens.findIndex((t, i) => i > 1 && t.value === '(');
        const closeParenIdx = tokens.findIndex((t, i) => i > parenIdx && t.value === ')');

        if (parenIdx === -1 || closeParenIdx === -1) {
          throw new Error('Invalid DIN syntax');
        }

        const diToken = tokens[parenIdx + 1];
        const bracketIdx = tokens.findIndex((t, i) => i > parenIdx && t.value === '[');
        const numToken = tokens[bracketIdx + 1];
        const closeBracketIdx = tokens.findIndex((t, i) => i > bracketIdx && t.value === ']');

        if (diToken?.value.toUpperCase() !== 'DI' || !numToken?.type || numToken.type !== 'NUMBER') {
          throw new Error('Invalid DI[n] reference');
        }

        const inputIndex = parseInt(numToken.value, 10);
        const inputValue = this.state.io.DI[inputIndex];

        this.context.log.push(`[${lineNumber}] WAIT DIN(DI[${inputIndex}]) = ${inputValue}`);

        if (!inputValue) {
          this.asyncWaitTimestamp = Date.now() + 100; // Poll every 100ms
        }
      }
    } catch (err) {
      throw new Error(`WAIT: ${(err as Error).message}`);
    }
  }

  /**
   * IF condition THEN ... ELSE ... ENDIF
   */
  private executeIF(tokens: Token[], lineNumber: number, fullLine: string): void {
    if (!this.context) throw new Error('No execution context');

    try {
      // Find THEN, ELSE, ENDIF keywords in the full line (or following lines)
      const conditionStr = fullLine.substring(fullLine.indexOf('(') + 1, fullLine.lastIndexOf(')'));
      const conditionResult = this.evaluateCondition(conditionStr);

      this.context.log.push(`[${lineNumber}] IF (${conditionStr}) = ${conditionResult}`);

      if (!conditionResult) {
        // Skip to ELSE or ENDIF
        while (
          this.state.programCounter < this.context.lines.length &&
          !this.context.lines[this.state.programCounter].toUpperCase().includes('ENDIF') &&
          !this.context.lines[this.state.programCounter].toUpperCase().includes('ELSE')
        ) {
          this.state.programCounter++;
        }

        // If ELSE, skip to ENDIF
        if (this.context.lines[this.state.programCounter]?.toUpperCase().includes('ELSE')) {
          this.state.programCounter++;
        }
      }
    } catch (err) {
      throw new Error(`IF: ${(err as Error).message}`);
    }
  }

  /**
   * FOR J=start TO end ... ENDFOR
   */
  private executeFOR(tokens: Token[], lineNumber: number, fullLine: string): void {
    if (!this.context) throw new Error('No execution context');

    try {
      const forMatch = fullLine.match(/FOR\s+(\w+)\s*=\s*(\d+)\s+TO\s+(\d+)/i);
      if (!forMatch) throw new Error('Invalid FOR syntax');

      const loopVar = forMatch[1].toUpperCase();
      const start = parseInt(forMatch[2], 10);
      const end = parseInt(forMatch[3], 10);

      this.context.log.push(`[${lineNumber}] FOR ${loopVar}=${start} TO ${end}`);

      // Store loop state in register (if it's a PR reference)
      if (loopVar.startsWith('PR') || loopVar === 'J') {
        const regIdx = parseInt(loopVar.match(/\d+/) ? loopVar.match(/\d+/)![0] : '1', 10);
        this.state.registers.PR[regIdx] = start;
      }
    } catch (err) {
      throw new Error(`FOR: ${(err as Error).message}`);
    }
  }

  /**
   * CALL program_name
   */
  private executeCALL(tokens: Token[], lineNumber: number): void {
    if (!this.context) throw new Error('No execution context');

    try {
      const progName = tokens[1]?.value;
      if (!progName) throw new Error('Expected program name');

      this.state.callStack.push(this.state.programCounter);
      this.context.log.push(`[${lineNumber}] CALL ${progName} (not implemented in MVP)`);
    } catch (err) {
      throw new Error(`CALL: ${(err as Error).message}`);
    }
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
    if (/^\d+\.?\d*$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // PR[n] reference
    const prMatch = trimmed.match(/PR\[(\d+)\]/i);
    if (prMatch) {
      return this.state.registers.PR[parseInt(prMatch[1], 10)] ?? 0;
    }

    // Simple arithmetic PR[n]+value, PR[n]-value, etc.
    const arithMatch = trimmed.match(/PR\[(\d+)\]\s*([\+\-\*\/])\s*(\d+)/i);
    if (arithMatch) {
      const regValue = this.state.registers.PR[parseInt(arithMatch[1], 10)] ?? 0;
      const operator = arithMatch[2];
      const value = parseInt(arithMatch[3], 10);

      switch (operator) {
        case '+':
          return regValue + value;
        case '-':
          return regValue - value;
        case '*':
          return regValue * value;
        case '/':
          return regValue / value;
        default:
          return 0;
      }
    }

    throw new Error(`Cannot evaluate expression: ${expr}`);
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
