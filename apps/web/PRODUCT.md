# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are active Margonem players who want their play data and coordination tools available outside the game. Organized guilds are the core collaborative audience, with guild leaders and tacticians as an important secondary audience responsible for coordination, permissions, events, and shared records.

## Product Purpose

The Lootlog web app is the authenticated browser dashboard for reviewing and acting on data collected through Lootlog. It gives individual players a persistent view of their battles and notifications, while giving guilds a shared workspace for loot history, synchronized timers, reservations, events, documents, statistics, and administration.

Success means players can understand their activity and guilds can coordinate recurring work from one shared, current source instead of fragmented chat messages, notes, and spreadsheets.

## Positioning

Lootlog connects an in-game data-collecting and coordination overlay with a shared web dashboard. Its defining mechanism is real-time guild synchronization: events observed during play become durable records and collaborative tools that members can inspect and manage in the browser.

## Operating Context

- Players authenticate with Discord and use the dashboard across their Margonem characters and worlds.
- Individual workflows include reviewing battle history, battle statistics, head-to-head results, watched-item notifications, and account or appearance preferences.
- Guild workflows include reviewing loots and kills, monitoring timers, reserving spawns, coordinating events, maintaining documents, sending notifications, and auditing activity.
- Guild leaders and authorized members manage roles, permissions, members, tracked NPCs, map templates, reservation rules, servers, and guild information.
- Public battle links allow a battle record to be viewed outside the authenticated dashboard.

## Capabilities and Constraints

- Authenticated individual and guild-scoped routes are distinct product contexts.
- Guild functionality is permission-aware and must preserve roles and authorization boundaries.
- The dashboard consumes data produced by the in-game client and shared Lootlog services; it is not the source of raw in-game observations.
- The app supports localized user-facing copy and currently contains Polish product terminology.
- The app is a client-rendered React web application and is not server-side rendered.
- Lootlog is free and open source.

## Brand Commitments

- The product name is **Lootlog**, commonly presented as **lootlog.pl**.
- Lootlog is built by Margonem players for Margonem players.
- The product may confidently describe itself as free, open source, Discord-authenticated, and usable across characters and worlds.
- Product language may confidently state that Lootlog does not automate character movement or interfere with the game engine.
- The current public links to documentation, GitHub, Discord, and community support are part of the product ecosystem.

## Evidence on Hand

- The route model and implemented screens cover player dashboards, battle analysis, guild loots, timers, reservations, documents, statistics, events, notifications, activity logs, and administration.
- The repository contains real localized product copy under `src/i18n/translations/`.
- The application uses shared API, socket, type, and UI packages from the Lootlog monorepo.
- The public GitHub repository is `https://github.com/lootlog/monorepo`.
- Claims that Lootlog is free, open source, safe to use without gameplay automation, used by thousands of users, and usable across characters and worlds are confirmed.

## Product Principles

- Turn live play into durable, useful records.
- Keep the individual player view and guild operating view connected.
- Make shared state current enough for real coordination.
- Respect guild permissions and ownership boundaries.
- Prefer transparent, inspectable tools over hidden automation.
