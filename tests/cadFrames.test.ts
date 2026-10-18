import fs from 'fs';
import path from 'path';
import { HOME_JOINTS, forward, type Joints } from '../app/kinematics';
import {
  CAD_LINK_FRAME_INDEX,
  CAD_LINK_IDS,
  cadLinkOriginMm,
  cadLinkTransform,
  mat4ToThreeSetArgs,
} from '../app/viewer/cadFrames';
import { identity, translationOf } from '../app/kinematics/math';

const VISUAL_DIR = path.join(__dirname, '../assets/lrmate200id/visual');

describe('CAD link frames', () => {
  it('maps base_link to identity and link_i to jointTransforms index i-1', () => {
    expect(CAD_LINK_IDS).toEqual([
      'base_link',
      'link_1',
      'link_2',
      'link_3',
      'link_4',
      'link_5',
      'link_6',
    ]);
    expect(CAD_LINK_FRAME_INDEX.base_link).toBeNull();
    expect(CAD_LINK_FRAME_INDEX.link_1).toBe(0);
    expect(CAD_LINK_FRAME_INDEX.link_2).toBe(1);
    expect(CAD_LINK_FRAME_INDEX.link_3).toBe(2);
    expect(CAD_LINK_FRAME_INDEX.link_4).toBe(3);
    expect(CAD_LINK_FRAME_INDEX.link_5).toBe(4);
    expect(CAD_LINK_FRAME_INDEX.link_6).toBe(5);
  });

  it('places base_link at the origin', () => {
    expect(cadLinkOriginMm(HOME_JOINTS, 'base_link')).toEqual([0, 0, 0]);
    expect(cadLinkTransform(HOME_JOINTS, 'base_link')).toEqual(identity());
  });

  it('places link_6 at the FK flange pose', () => {
    const joints: Joints = [0.2, -0.3, 0.4, -0.1, 0.5, 0.25];
    const origin = cadLinkOriginMm(joints, 'link_6');
    const pose = forward(joints);
    expect(origin[0]).toBeCloseTo(pose.x, 6);
    expect(origin[1]).toBeCloseTo(pose.y, 6);
    expect(origin[2]).toBeCloseTo(pose.z, 6);
  });

  it('exports row-major args for THREE.Matrix4.set', () => {
    const T = cadLinkTransform(HOME_JOINTS, 'link_1');
    const args = mat4ToThreeSetArgs(T);
    expect(args).toHaveLength(16);
    expect(args[3]).toBeCloseTo(translationOf(T)[0], 10);
    expect(args[7]).toBeCloseTo(translationOf(T)[1], 10);
    expect(args[11]).toBeCloseTo(translationOf(T)[2], 10);
    expect(args[15]).toBe(1);
  });

  it('vendors the seven visual STLs', () => {
    for (const id of CAD_LINK_IDS) {
      const file = path.join(VISUAL_DIR, `${id}.stl`);
      expect(fs.existsSync(file)).toBe(true);
      expect(fs.statSync(file).size).toBeGreaterThan(1000);
    }
  });
});
