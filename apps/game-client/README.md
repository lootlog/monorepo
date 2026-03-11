# Game Client

In-game companion overlay for Margonem built with React 19.

## Overview

The Game Client is an overlay application that runs alongside the Margonem game, providing real-time information, notifications, and quick access to Lootlog features directly in the game window.

## Features

- **Real-Time Notifications** - Boss timers, loot drops, clan updates
- **Quick Access Panel** - Fast access to clan features
- **Timer Display** - Visual countdown for boss spawns
- **Battle Logging** - Automatic battle data capture
- **Loot Tracking** - Real-time loot recording
- **Socket.IO Integration** - Live updates from Gateway service
- **Minimal UI** - Non-intrusive overlay design

## Tech Stack

- **React 19** - Modern React with concurrent features
- **Vite** - Fast build tool and dev server
- **TanStack Query** - Data fetching and caching
- **Socket.IO Client** - WebSocket connections
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible components from `@lootlog/ui`

## Architecture

The client communicates with:

- **Gateway Service** - WebSocket connections for real-time updates
- **API Service** - REST endpoints for data fetching
- **Auth Service** - User authentication

## Development

```bash
# From monorepo root
cd apps/game-client
pnpm dev                 # Start development server

# Client runs on http://localhost:5174
```

## Building

```bash
# From monorepo root
pnpm build:game-client   # Build for production

# Output: apps/game-client/dist/
```

## Deployment

The game client is designed to be:

- Loaded as an overlay in the browser
- Injected into the game via browser extension
- Served as a standalone companion window

## Environment Variables

See `.env.sample` for required configuration:

- API URL
- Gateway WebSocket URL
- Auth service URL
