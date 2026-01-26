# Web Dashboard

Guild loot tracking dashboard with real-time updates.

## Tech Stack

- React 19 with React Compiler
- Vite 7
- TanStack Router (file-based routing)
- TanStack Query with IndexedDB persistence
- Zustand for state
- Socket.IO for real-time
- Tailwind CSS + @lootlog/ui components

## Commands

```bash
pnpm dev       # Dev server on port 3000
pnpm build     # Build with TypeScript check
pnpm preview   # Preview production build
```

## Key Files

- `src/routes/` - TanStack Router file-based routes
- `src/features/` - Feature modules (guild, battle-panel, events, reservations, stats)
- `src/lib/` - Core utilities (query-client, api-client, gateway-client, auth-client)
- `src/contexts/` - React contexts (theme, global, guild, gateway)
- `src/store/` - Zustand stores

## Environment Variables

- `VITE_API_URL` - Lootlog API
- `VITE_AUTH_SERVICE_URL` - Auth service
- `VITE_GATEWAY_URL` - WebSocket gateway
- `VITE_DISCORD_CLIENT_ID` - Discord OAuth

## Features

Guild management, loot tracking, battle logging, event calendar, timers, activity logs, reservations, member management.
