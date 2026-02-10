# Cursor Workflow - FANUC iOS MVP

This file tells you how to use Cursor efficiently to build this app.

## How to Feed Prompts

1. Open each prompt file in order:
   - `prompts/01-interpreter.md`
   - `prompts/02-ui-components.md`
   - `prompts/03-state-management.md`
   - `prompts/04-3d-rendering.md`

2. For each prompt:
   - Open the file in your editor
   - Copy the task + requirements section
   - Paste into Cursor's chat
   - Let it generate code

3. Cursor will ask clarifying questions. Answer them based on context.

## Cursor Commands to Use

### File Creation
When Cursor offers to create a file:
- Accept it
- Review the code for correctness
- If something looks off, ask it to fix

### Code Review
After each step, ask Cursor:
```
"Review the [ComponentName] implementation. Is there anything 
we should improve for iPad/iOS before moving to the next step?"
```

### Testing
After wiring components together:
```
"Create a test file that shows the full flow: 
write code → click run → see arm move and I/O update"
```

## Folder Structure to Create

Before starting, create this in your project root:

```
fanuc-ios-mvp/
├── docs/
│   ├── fanuc-syntax.md        (already created)
│   └── api.md
├── prompts/
│   ├── 01-interpreter.md      (already created)
│   ├── 02-ui-components.md
│   ├── 03-state-management.md
│   └── 04-3d-rendering.md
├── app/
│   ├── components/
│   ├── utils/
│   ├── store/
│   └── App.tsx
├── package.json
└── README.md
```

## Pro Tips for Speed

1. **Pre-load context** — If Cursor needs to understand earlier steps, paste relevant code snippets into its context before asking new questions.

2. **Batch related tasks** — If it suggests refactoring while building, ask it to save that for later (focus on MVP first).

3. **Use @docs mention** — If Cursor should reference fanuc-syntax.md or existing code, mention it explicitly:
   ```
   "@docs/fanuc-syntax.md — Build the parser to handle these commands"
   ```

4. **Watch for dependencies** — Each step depends on the previous:
   - Interpreter must work before UI wiring
   - UI components must render before state management
   - State management must work before 3D rendering
   
   Don't skip steps.

5. **Test incrementally** — After each prompt, ask Cursor to write a small test that proves that layer works in isolation.

## Expected Timeline

- **Prompt 1 (Interpreter):** 2-3 hours
- **Prompt 2 (UI Components):** 2-3 hours
- **Prompt 3 (State Management):** 1-2 hours
- **Prompt 4 (3D Rendering):** 2-3 hours

**Total:** 7-11 hours of AI-assisted development.

## Common Pitfalls

- ❌ Jumping to UI before interpreter works (interpreter is the foundation)
- ❌ Over-complicating 3D rendering early (simple geometry first, polish later)
- ❌ Not testing between steps (each layer should work independently first)
- ✅ Small, testable chunks
- ✅ Verify each prompt output before moving on
- ✅ Ask Cursor to explain unclear code

## Next Phase (Beyond MVP)

Once MVP works, you can:
- Add step-through debugging (pause between commands)
- Build real FANUC pendant UI (buttons, screen replica)
- Integrate actual robot kinematics (DH parameters for FANUC models)
- Add more commands and syntax features
- Deploy to TestFlight

But first: get MVP working end-to-end.

---

**Ready?** Start with prompt 01-interpreter.md in Cursor. Good luck.
