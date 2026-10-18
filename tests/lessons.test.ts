import { getLesson, LESSONS, REACHABLE_PROGRAM, UNREACHABLE_PROGRAM } from '../app/lessons';

describe('lessons', () => {
  it('exports a reachable lesson and an unreachable MOVE P[10] lesson', () => {
    expect(LESSONS.map((lesson) => lesson.id)).toEqual(['reachable', 'unreachable']);
    expect(getLesson('reachable')?.program).toBe(REACHABLE_PROGRAM);
    expect(getLesson('unreachable')?.program).toBe(UNREACHABLE_PROGRAM);
    expect(UNREACHABLE_PROGRAM).toMatch(/MOVE P\[10\]/);
    expect(REACHABLE_PROGRAM).toMatch(/MOVE P\[1\]/);
    expect(REACHABLE_PROGRAM).toMatch(/MOVE P\[2\]/);
  });

  it('returns undefined for an unknown lesson id', () => {
    expect(getLesson('missing')).toBeUndefined();
  });
});
