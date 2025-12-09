# Game Client

In-game overlay companion app injected into Margonem as a userscript.

## Tech Stack

- React 19 with React Compiler
- Vite + vite-plugin-monkey (userscript generation)
- Zustand for state
- TanStack Query for data fetching
- Socket.IO for real-time updates
- Tailwind CSS with `ll:` prefix (style isolation)

## Commands

```bash
pnpm dev              # Dev server on localhost:5174
pnpm build            # Build userscript bundle
pnpm test             # Run Vitest tests
```

## Key Files

- `src/main.tsx` - Creates isolated #lootlog-root with Tailwind prefixes
- `src/App.tsx` - Providers setup and feature initialization
- `src/features/` - Feature modules (timers, notifications, npc-detector, chat, etc.)
- `src/store/` - Zustand stores (timers, windows, notifications, settings)

## Features

- Boss timer notifications
- Loot drop tracking
- NPC spawn detection
- In-game chat integration
- Battle logging
- Quick access to guild features

## Styling

All Tailwind classes prefixed with `ll:` to avoid conflicts with game CSS. Styles scoped to #lootlog-root element.
