# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audience for the landing page is a guild decision-maker evaluating whether Lootlog will improve the group's coordination and shared record. Active Margonem players remain an important audience, but the first viewport should help a guild leader or tactician understand and justify adoption.

## Product Purpose

The Lootlog landing app explains the product, establishes trust, helps players install the in-game addon, and directs existing users to the authenticated dashboard. It also hosts product documentation and legal information.

Success means a suitable Margonem player understands what Lootlog does, why it is safe and useful, and how to install or enter the product without needing a separate explanation.

## Positioning

Lootlog connects an in-game data-collecting and coordination overlay with a shared web dashboard. Its defining mechanism is real-time guild synchronization: automatically observed gameplay data becomes shared timers, records, analysis, and coordination tools for the whole guild.

## Operating Context

- Prospective users arrive while comparing Margonem addons or after hearing about Lootlog from another player or guild.
- New users install the browser userscript through Tampermonkey, authenticate with Discord, play normally, and later inspect collected information in the web dashboard.
- Visitors can move from the landing page to installation documentation, the dashboard, GitHub, Discord, community support, privacy information, and terms.
- Documentation is part of the same app and provides the detailed setup path beyond the marketing overview.

## Capabilities and Constraints

- The app is a statically exported Next.js site containing the marketing homepage, documentation, and legal pages.
- The product story spans synchronized respawn timers, loot history, battle analysis, NPC detection, guild roles, chat, notifications, reservations, and shared records.
- All public claims must remain truthful and traceable to confirmed product behavior or approved evidence.
- Margonem artwork remains the property of Garmory sp. z o.o. and must retain the existing legal notice where applicable.
- Lootlog is free, open source, Discord-authenticated, and usable across characters and worlds.

## Brand Commitments

- The public brand is **lootlog.pl** and the product name is **Lootlog**.
- The product is built by Margonem players for Margonem players.
- The established voice is direct, game-literate, confident, and community-oriented.
- Lootlog may confidently state that it does not automate character movement, interfere with the game engine, or play on the user's behalf.
- Documentation, GitHub, Discord, and voluntary community support are part of the public product ecosystem.

## Evidence on Hand

- Current authenticated product screenshots approved for the landing page exist at `public/screenshots/dashboard-current.png`, `battle-panel-current.png`, and `guild-kill-stats-current.png`. Older captures remain available for reference but should not lead the product story.
- Confirmed testimonials from Kamil, Anna, and Marek are present in `src/i18n/translations/landing.json`.
- The landing copy's claims that Lootlog is free, open source, safe to use without gameplay automation, used by thousands of users, and usable across characters and worlds are confirmed.
- The public documentation is available at `https://docs.lootlog.pl`.
- The public GitHub repository is `https://github.com/lootlog/monorepo`.
- The community Discord and support links are maintained in `src/config/links.ts`.

## Product Principles

- Explain the connected in-game and web workflow as one product.
- Lead with concrete player and guild outcomes.
- Make trust claims explicit and support them with real evidence.
- Move a convinced visitor cleanly toward installation or the dashboard.
- Preserve community ownership and open-source transparency.
