# DragonQuest

> ⚠️ Working title — will be renamed before any public release (trademark risk).

Gamified personal growth and daily-routine app with an anime-style training
progression system. Built with Expo + React Native + TypeScript.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full technical design,
data model, and roadmap.

## Getting started

```bash
npm install
npm start        # scan the QR code with Expo Go on your phone
```

## Development

```bash
npm run check    # lint + typecheck
npm run lint     # eslint only
npm run typecheck
```

Project layout: routes live in `src/app/`, design system in `src/design-system/`,
feature logic in `src/features/`, game rules in `src/game/` (all tunable numbers in
`src/game/config/`).
