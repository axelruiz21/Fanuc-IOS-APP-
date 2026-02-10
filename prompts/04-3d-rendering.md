# Prompt 4: 3D Arm Visualization

Feed this to Cursor when basic execution is working.

---

## Task

Build a real 3D visualization of a FANUC robot arm that updates as the program executes.

## Approach

Use **Babylon.js** in React (via `@react-three/babylon` if available, or direct Babylon.js).

Start simple:
- 4-5 cylinders representing arm segments
- Base, shoulder, elbow, wrist, end effector
- Proper rotation/translation based on position state
- Coordinate axes (X=red, Y=green, Z=blue)

## Arm Kinematics (Simplified)

For MVP, don't solve full inverse kinematics. Instead:
- User defines positions P[1], P[2], etc. with X,Y,Z,Rx,Ry,Rz
- When MOVE P[n] executes, jump the arm to that position
- Animate the transition smoothly

```typescript
interface Position {
  x: number;      // mm from base
  y: number;      // mm from base
  z: number;      // mm from base
  rx: number;     // rotation X (degrees)
  ry: number;     // rotation Y (degrees)
  rz: number;     // rotation Z (degrees)
}

// Apply to arm:
// - Base at origin
// - Shoulder at (0, 0, 100)
// - Elbow at (x1, y1, z1) — derived from position
// - Wrist at (x2, y2, z2)
// - End effector at (x, y, z)
```

## Scene Setup

```typescript
// Babylon.js scene
const scene = new Scene();
const camera = new ArcRotateCamera(...);
const light = new HemisphericLight(...);

// Ground
const ground = MeshBuilder.CreateGround("ground", {width: 2000, height: 2000});

// Arm components
const base = MeshBuilder.CreateCylinder("base", {height: 50, diameter: 100});
const shoulder = MeshBuilder.CreateCylinder("shoulder", {height: 300, diameter: 40});
const elbow = MeshBuilder.CreateCylinder("elbow", {height: 300, diameter: 35});
const wrist = MeshBuilder.CreateSphere("wrist", {diameter: 30});
const endEffector = MeshBuilder.CreateSphere("ee", {diameter: 20}); // Tool center point

// Position and color
base.position.y = 25;
shoulder.position.y = 150;
// ... etc

// Coordinate axes
const xAxis = MeshBuilder.CreateTube("xaxis", {path: [0,0,0], 0,0,200]});
xAxis.material.emissiveColor = Color3.Red();
// Y and Z similarly
```

## Animation

When position changes:

```typescript
// Target position
const target = {x: 100, y: 200, z: 300, rx: 0, ry: 45, rz: 0};

// Interpolate over time (e.g., 1 second)
const startPos = currentPosition;
const duration = 1000; // ms
const startTime = Date.now();

// In render loop:
const elapsed = Date.now() - startTime;
const t = Math.min(elapsed / duration, 1);

const interpPos = lerp(startPos, target, t);
applyPositionToArm(interpPos);

if (t === 1) armAtTarget = true;
```

## UI Integration

- Show current position (X, Y, Z, Rx, Ry, Rz) as text overlay
- Show target position when moving
- Color change: arm green when idle, yellow when moving, red on error
- Reset camera button to view full arm

## Position Recording

For user convenience, add ability to:
```
// In pendant UI:
User presses "TEACH" button
→ Current arm position saved to P[n]
→ Can be used in code later
```

## Deliverable

Create:
- `app/components/Arm3D.tsx` — Babylon.js component
- `app/utils/armKinematics.ts` — position interpolation, arm mesh updates
- Update App.tsx to pass position state to Arm3D
- Test: run MOVE P[1], watch arm animate to that position

---

**Focus:** Get smooth animation and position tracking working. Don't worry about perfect kinematics yet.
