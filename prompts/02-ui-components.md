# Prompt 2: React Native UI Components

Feed this to Cursor after interpreter is working.

---

## Task

Build React Native components for the FANUC teach pendant iOS app. Focus on UX that mirrors a real pendant but works well on iPad.

## Components to Build

### CodeEditor.tsx
- Multi-line text input for FANUC code
- Syntax highlighting for keywords (MOVE, DOUT, WAIT, IF, etc.)
- Line numbers
- Basic autocompletion (show available commands)
- "Run" button at bottom

### Arm3D.tsx
- 3D visualization of robotic arm
- Use Babylon.js or Three.js (wrapped via react-three-fiber if possible)
- Start simple: 4 cylinders representing arm segments
- Show current position as a ball/sphere at end effector
- Update position when interpreter executes MOVE command
- Add coordinate labels (X, Y, Z axes)

### IOPanel.tsx
- Display I/O state in real-time
- Digital Inputs: DI[1..16] as read-only toggles (gray if off, green if on)
- Digital Outputs: DO[1..16] as toggles user can click to simulate input
- Register display: Show PR[1..10] (first 10 numeric registers)
- Position list: Show P[1..20] with their coordinates

### Console.tsx
- Output log of program execution
- Show each command as it executes
- Color-code: success (green), error (red), info (blue)
- Scrollable, auto-scroll to bottom
- "Clear" button

### App.tsx
- Layout: Split screen
  - Left: CodeEditor (60%)
  - Right: Arm3D (40%) on top, IOPanel below
  - Bottom: Console
- Global state management (use Context API or Zustand)
- Wire interpreter to UI

## Design Notes

- **iPad-first:** Use flexbox for responsive layout, assume landscape orientation
- **Dark theme:** Dark background, light text (common in tech apps)
- **Touch-friendly:** Buttons should be 44x44 minimum
- **Real-time updates:** Console and I/O should update instantly as program runs

## Example Component Structure

```typescript
// CodeEditor
interface CodeEditorProps {
  onRun: (code: string) => void;
  code: string;
  setCode: (code: string) => void;
}

// Arm3D
interface Arm3DProps {
  position: {x, y, z, rx, ry, rz};
  positions: Position[];
}

// IOPanel
interface IOPanelProps {
  io: IOState;
  registers: {[key: number]: number};
  onIOChange: (type: 'DI'|'DO', index: number, value: boolean) => void;
}
```

## Deliverable

Create files in `app/components/`:
- `CodeEditor.tsx`
- `Arm3D.tsx`
- `IOPanel.tsx`
- `Console.tsx`
- `App.tsx` (main layout)

Don't wire to interpreter yet — just make sure they render and accept props.

---

**Focus:** Get the layout solid and components rendering. Props are mocked for now.
