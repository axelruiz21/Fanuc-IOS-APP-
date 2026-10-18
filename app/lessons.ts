export const REACHABLE_PROGRAM = `; FANUC Teach Pendant Program
; Define positions and execute movement

MOVE P[1]
DOUT OT[1]=ON
WAIT 1.0
MOVE P[2]
DOUT OT[1]=OFF
END
`;

export const UNREACHABLE_PROGRAM = `; Unreachable target — Play should fail MOVE
MOVE P[10]
END
`;

export interface Lesson {
  id: string;
  title: string;
  notes: string;
  program: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'reachable',
    title: '1. Reachable MOVE',
    notes: 'Play: arm jumps to P[1] then P[2]. Teach or edit P[n] in the P[] tab.',
    program: REACHABLE_PROGRAM,
  },
  {
    id: 'unreachable',
    title: '2. Unreachable MOVE',
    notes: 'Play: MOVE P[10] fails with unreachable; the arm does not move.',
    program: UNREACHABLE_PROGRAM,
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}
