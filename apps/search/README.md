# Search Service

Fast full-text search service built with Hono and Meilisearch.

## Overview

The Search Service provides powerful full-text search capabilities across Lootlog data. It indexes items, NPCs, locations, and other game content, making them quickly searchable through a REST API.

## Features

- **Full-Text Search** - Fast and accurate search results
- **Meilisearch Integration** - Powered by Meilisearch engine
- **Automatic Indexing** - Listens to RabbitMQ events for real-time updates
- **Multi-Index Support** - Separate indices for different data types
- **Faceted Search** - Filter by categories, types, levels
- **Typo Tolerance** - Handles misspellings automatically
- **Instant Results** - Sub-millisecond search responses

## Tech Stack

- **Hono** - Lightweight web framework
- **Meilisearch** - Fast search engine (port 7700)
- **RabbitMQ** - Event-driven indexing
- **TypeScript** - Type-safe development

## Search Indices

The service maintains indices for:

- **Items** - Game items and equipment
- **NPCs** - Monsters and bosses
- **Locations** - Maps and areas
- **Loots** - Clan loot records
- **Warriors** - Player statistics

## Event-Driven Indexing

Listens to RabbitMQ events:

- `item.created` → Index new item
- `item.updated` → Update item index
- `loot.created` → Index new loot
- `npc.created` → Index new NPC

## API Endpoints

- `GET /api/search/items?q=sword` - Search items
- `GET /api/search/npcs?q=dragon` - Search NPCs
- `GET /api/search/locations?q=cave` - Search locations
- `GET /api/search/loots?q=epic` - Search loots
- `POST /api/search/reindex` - Trigger full reindex

## Development

```bash
# From monorepo root
cd apps/search
pnpm dev                 # Start development server

# Service runs on http://localhost:3035
# Meilisearch UI: http://localhost:7700
```

## Environment Variables

See `.env.sample` for required configuration:

- Meilisearch connection
- RabbitMQ connection
- API keys
