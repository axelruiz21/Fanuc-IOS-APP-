# AGENTS.md

## Cursor Cloud specific instructions

This is a single Expo / React Native (SDK 50, TypeScript) app: the **FANUC iOS Teach Pendant MVP**, an educational robot-programming simulator. It is fully client-side — there is no backend, database, Docker, or environment variables/secrets. Core logic is the in-process `FANUCInterpreter` (`app/utils/interpreter.ts`) wrapped by a Zustand store (`app/store/`) and rendered by the UI in `app/App.tsx`.

### Commands (defined in `package.json`)
- Tests: `npm test` (Jest, 29 tests across `tests/`). This is the most reliable end-to-end path since it exercises the interpreter + store directly.
- Type check: `npm run type-check` (`tsc --noEmit`) — passes clean.
- Run the app (UI): `npm run start:web` serves the app via Metro at `http://localhost:8081`. In this headless Linux VM, web is the only viable UI path; `start:ios` needs macOS + Xcode and `start:android` needs the Android SDK.

### Non-obvious caveats
- `npm run lint` currently FAILS: the `eslint . --ext .ts,.tsx` script has no ESLint config file committed in the repo, so ESLint errors with "couldn't find a configuration file". This is a pre-existing repo gap, not an environment problem. Use `npm run type-check` for static verification until an ESLint config is added.
- Expo web requires `react-dom`, `react-native-web`, and `@expo/metro-runtime`. These are included in `package.json` (installed via `npx expo install`) so `npm install` covers them.
- `app.json` references `./assets/{icon,splash,adaptive-icon,favicon}.png`, but no `assets/` directory exists. On `start:web` this only produces a non-fatal `jimp` "Crc error" while generating the favicon; the app bundles and serves correctly (HTTP 200). It would matter for native/EAS builds.
- Running `expo start` auto-rewrites `tsconfig.json` (adds `extends: expo/tsconfig.base` and reformats). This is expected Expo behavior and can be left or discarded; it is not required for tests or type-check.
- No `.env`/secrets are needed anywhere.
