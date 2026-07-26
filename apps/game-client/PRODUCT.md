# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are active Margonem players using Lootlog during live play. Organized guild members are the core collaborative audience, with guild leaders and tacticians as an important secondary audience coordinating shared timers, events, parties, and information.

## Product Purpose

The Lootlog game client is a userscript that embeds Lootlog's interface into supported Margonem pages. It observes gameplay events, gives players immediate in-game tools, and connects those observations to shared Lootlog services and the browser dashboard.

Success means useful information is captured with minimal manual work, players can coordinate without leaving the game, and the guild's shared state stays synchronized while members play.

## Positioning

Lootlog connects an in-game data-collecting and coordination overlay with a shared web dashboard. Its defining mechanism is real-time guild synchronization: gameplay observations and player actions update shared timers, communication, notifications, event state, and durable records without automating play.

## Operating Context

- The client runs through Tampermonkey in the Margonem game page and depends on access to the page's live game runtime.
- Players use the overlay while actively navigating the game, fighting, watching maps, coordinating with guild members, and responding to time-sensitive events.
- The interface appears as in-game windows, under-bag surfaces, quick-access tools, commands, warnings, and transient notifications rather than as a standalone site.
- Player identity, account, character, selected guild, world, and game-interface variant influence the available context.
- Real-time socket connections synchronize guild activity with other players and Lootlog services.

## Capabilities and Constraints

- Implemented modules include timers, manual timer creation, chat, notifications, NPC detection, online-player information, party finding and ready rooms, map pings, event mode, quick access, commands, settings, and preference synchronization.
- The client supports multiple Margonem interface variants and must coexist with the game's own layout and interaction model.
- It must not automate character movement, perform gameplay actions for the user, or interfere with the game engine.
- It is a browser userscript, not a native desktop or mobile application.
- The client relies on Margonem runtime events and shared Lootlog APIs, sockets, and account data.
- The app supports localized user-facing copy and currently contains Polish product terminology.
- Lootlog is free, open source, Discord-authenticated, and usable across characters and worlds.

## Brand Commitments

- The product name is **Lootlog**, commonly presented publicly as **lootlog.pl**.
- Lootlog is built by Margonem players for Margonem players.
- The in-game experience should feel like a capable extension of play, not a separate administrative product.
- Lootlog may confidently state that it is safe to use because it provides UI and information without automating gameplay or interfering with the game engine.
- Community participation through Discord and GitHub is part of the product identity.

## Evidence on Hand

- The executable feature composition is defined in `src/app-content.tsx`.
- Runtime integration behavior is documented in `docs/runtime-integration.md`.
- Real product screenshots of timers, NPC detection, chat, and notifications exist in the landing app under `apps/landing/public/screenshots/`.
- The userscript build and supported-page integration are configured in `vite.config.ts`.
- The app has tests for core feature behavior, including chat, timers, initialization, settings, and runtime integration.
- Claims that Lootlog is free, open source, safe to use without gameplay automation, used by thousands of users, and usable across characters and worlds are confirmed.

## Product Principles

- Assist active play without playing for the user.
- Capture useful events with as little manual effort as possible.
- Keep guild state synchronized in real time.
- Fit naturally into the game's existing context and constraints.
- Connect immediate in-game action with durable web records.
