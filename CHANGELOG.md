# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial open source release
- MIT License
- Contributing guidelines
- Code of Conduct
- Security policy
- Issue and PR templates

## [1.0.0] - 2025-10-25

### Added
- Full-stack microservices architecture with Turborepo
- Guild loot tracking system
- Battle logging and statistics
- Discord bot integration with timer sync
- Real-time game client companion
- User authentication with Discord OAuth
- Search functionality with Meilisearch
- React 19 web dashboard with TanStack Router/Query
- Three-database architecture (Users, Lootlog, Battlelog)
- RabbitMQ-based inter-service communication
- Socket.IO real-time updates
- Environment configuration CLI with smart defaults
- Comprehensive database migrations
- Docker Compose infrastructure setup
- CI/CD workflows for all services

### Services
- **API Service** - Main NestJS backend for guilds, loots, timers, NPCs
- **Auth Service** - Hono-based authentication with Better-Auth
- **Battlelog Service** - Battle statistics and character data
- **Gateway** - Socket.IO gateway for real-time events
- **Discord Bot** - NestJS + necord Discord integration
- **Search Service** - Meilisearch indexing and search
- **Web Dashboard** - React 19 admin panel
- **Game Client** - In-game companion overlay
- **Landing Page** - Next.js 16 marketing site

### Packages
- **UI Package** - Shared Radix UI + Tailwind components
- **Types Package** - Shared TypeScript types
- **API Helpers** - JWT/JWKS authentication utilities
- **CLI Package** - Environment configuration tool
- **ESLint Config** - Shared linting rules
- **TypeScript Config** - Shared TS configuration

### Infrastructure
- PostgreSQL 17 (3 separate databases)
- Redis for caching
- RabbitMQ 4 for message queuing
- Meilisearch for full-text search
- Docker Compose orchestration

[unreleased]: https://github.com/lootlog/lootlog/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/lootlog/lootlog/releases/tag/v1.0.0
