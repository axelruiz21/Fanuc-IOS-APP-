// Metro lazy bundling (dynamic import()) on web needs this runtime in the
// initial bundle; expo/metro-config hoists it to the front. Without it every
// `import('./x')` on web fails with "Requiring unknown module" and the CAD
// arm, HDR lighting, and post stack silently fall back.
import '@expo/metro-runtime';

export { default } from './app/App';
