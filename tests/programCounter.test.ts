import {
  displayLineNumber,
  editorHighlightIndex,
} from '../app/editor/programCounter';

describe('programCounter helpers', () => {
  it('does not highlight when execution is inactive', () => {
    expect(editorHighlightIndex(0, false, 5)).toBeNull();
  });

  it('highlights the 0-based PC while active', () => {
    expect(editorHighlightIndex(2, true, 5)).toBe(2);
  });

  it('does not highlight a PC past the last editor line', () => {
    expect(editorHighlightIndex(5, true, 5)).toBeNull();
  });

  it('shows 1-based line numbers in the UI', () => {
    expect(displayLineNumber(0)).toBe(1);
    expect(displayLineNumber(3)).toBe(4);
  });
});
