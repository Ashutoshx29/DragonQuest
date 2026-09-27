This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

# DragonQuest Agent Workflow

## Required workflow

For every non-trivial task:

1. Inspect the existing architecture before coding.
2. Prefer the smallest correct change.
3. Reuse existing components, repositories, hooks, services, and game-engine logic.
4. Do not create parallel implementations.

### Planning

For multi-file or architectural work:

- establish the goal
- identify affected systems
- identify risks
- define verification criteria
- implement only after the plan is understood

### UI / UX work

When changing UI, interaction, animation, responsive behavior, or visual design:

- preserve existing design tokens
- reuse existing components
- test on the actual device when possible
- verify accessibility and mobile layout
- avoid decorative complexity without user value

### After meaningful implementation

Perform an over-engineering review:

- remove unnecessary abstractions
- remove unnecessary dependencies
- remove duplicated logic
- simplify where safe
- keep security, validation, persistence, and correctness intact

### Code quality review

Before declaring a significant change complete:

- inspect error handling
- inspect security boundaries
- inspect auth/RLS behavior
- inspect data synchronization
- inspect duplicate/idempotency behavior
- inspect tests
- inspect dependency changes

### Verification

Run the smallest relevant verification set, expanding it when the change affects shared systems:

- TypeScript
- ESLint
- tests
- DB smoke tests
- web export
- Android export
- device verification

### Never

- weaken RLS to fix a test
- suppress TypeScript errors
- use `any` to hide a type problem
- duplicate business logic
- reset databases to hide migration problems
- delete useful tests to make the suite pass
- add dependencies without justification
- move to the next phase with known failing runtime behavior
