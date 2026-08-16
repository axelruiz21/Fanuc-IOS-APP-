import { HOME_JOINTS, forward } from '../app/kinematics';
import { armOriginsMm } from '../app/components/armLinks';

describe('armOriginsMm', () => {
  it('starts at the base and ends at the FK tip', () => {
    const origins = armOriginsMm(HOME_JOINTS);
    expect(origins[0]).toEqual([0, 0, 0]);
    const tip = origins[origins.length - 1];
    const pose = forward(HOME_JOINTS);
    expect(tip[0]).toBeCloseTo(pose.x, 6);
    expect(tip[1]).toBeCloseTo(pose.y, 6);
    expect(tip[2]).toBeCloseTo(pose.z, 6);
    expect(origins.length).toBeGreaterThan(2);
  });
});
