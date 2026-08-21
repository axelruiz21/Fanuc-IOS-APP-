import { jointTransforms, type Joints } from '../kinematics';
import { identity, translationOf, type Mat4 } from '../kinematics/math';

export const CAD_LINK_IDS = [
  'base_link',
  'link_1',
  'link_2',
  'link_3',
  'link_4',
  'link_5',
  'link_6',
] as const;

export type CadLinkId = (typeof CAD_LINK_IDS)[number];

/** `null` means the mesh sits at the URDF identity (base_link). */
export const CAD_LINK_FRAME_INDEX: Record<CadLinkId, number | null> = {
  base_link: null,
  link_1: 0,
  link_2: 1,
  link_3: 2,
  link_4: 3,
  link_5: 4,
  link_6: 5,
};

export const CAD_LINK_COLORS: Record<CadLinkId, string> = {
  base_link: '#474747',
  link_1: '#F5C221',
  link_2: '#F5C221',
  link_3: '#F5C221',
  link_4: '#F5C221',
  link_5: '#F5C221',
  link_6: '#262626',
};

/** Visual origin is identity in each URDF link frame. */
export function cadLinkTransform(joints: Joints, id: CadLinkId): Mat4 {
  const index = CAD_LINK_FRAME_INDEX[id];
  if (index === null) {
    return identity();
  }
  return jointTransforms(joints)[index];
}

export function cadLinkOriginMm(joints: Joints, id: CadLinkId): [number, number, number] {
  const p = translationOf(cadLinkTransform(joints, id));
  return [p[0] * 1000, p[1] * 1000, p[2] * 1000];
}

/** Row-major 16-tuple for `THREE.Matrix4.set(...)`. */
export function mat4ToThreeSetArgs(
  T: Mat4
): [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
] {
  return [
    T[0][0],
    T[0][1],
    T[0][2],
    T[0][3],
    T[1][0],
    T[1][1],
    T[1][2],
    T[1][3],
    T[2][0],
    T[2][1],
    T[2][2],
    T[2][3],
    T[3][0],
    T[3][1],
    T[3][2],
    T[3][3],
  ];
}
