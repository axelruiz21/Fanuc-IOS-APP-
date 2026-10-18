/** 0-based VM program counter helpers for the 1-based editor gutter. */

export function editorHighlightIndex(
  programCounter: number,
  active: boolean,
  lineCount: number
): number | null {
  if (!active) return null;
  if (programCounter < 0 || programCounter >= lineCount) return null;
  return programCounter;
}

export function displayLineNumber(programCounter: number): number {
  return programCounter + 1;
}
