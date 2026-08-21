import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('EAS ship config', () => {
  const eas = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8')) as {
    build: {
      development: { developmentClient: boolean; distribution: string; ios?: { simulator?: boolean } };
      preview: { distribution: string };
      production: Record<string, unknown>;
    };
  };
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')) as {
    expo: {
      ios?: { bundleIdentifier?: string; supportsTablet?: boolean };
      android?: { package?: string };
      extra?: { eas?: { projectId?: string } };
    };
  };

  it('defines development, preview, and production profiles', () => {
    expect(eas.build.development.developmentClient).toBe(true);
    expect(eas.build.development.distribution).toBe('internal');
    expect(eas.build.development.ios?.simulator).toBe(true);
    expect(eas.build.preview.distribution).toBe('internal');
    expect(eas.build.production).toEqual({});
  });

  it('uses real store identifiers and no placeholder EAS projectId', () => {
    expect(app.expo.ios?.bundleIdentifier).toBe('com.axelruiz.fanucpendant');
    expect(app.expo.ios?.supportsTablet).toBe(true);
    expect(app.expo.android?.package).toBe('com.axelruiz.fanucpendant');
    const projectId = app.expo.extra?.eas?.projectId;
    expect(projectId === undefined || /^[0-9a-f-]{36}$/i.test(projectId)).toBe(true);
    expect(projectId).not.toBe('fanuc-ios-mvp');
  });
});
