# Auth Service

Authentication service built with Hono and Better-Auth.

## Overview

The Auth service handles user authentication and authorization for the entire Lootlog platform. It provides Discord OAuth integration, session management, and JWT token generation.

## Features

- **Discord OAuth** - Login with Discord account
- **Email/Password Authentication** - Traditional login option
- **JWT Tokens** - Secure token-based authentication
- **JWKS Endpoint** - Public keys for JWT verification by other services
- **Session Management** - User session handling with Redis
- **Better-Auth Integration** - Modern authentication library

## Tech Stack

- **Hono** - Fast web framework
- **Better-Auth** - Authentication library
- **Kysely** - Type-safe SQL query builder
- **PostgreSQL** - User database (port 5432)
- **Redis** - Session storage

## Database

Uses the `lootlog-users-db` PostgreSQL database for:

- User accounts
- Discord profiles
- Sessions
- OAuth tokens

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/discord` - Discord OAuth flow
- `GET /api/auth/.well-known/jwks.json` - JWKS public keys
- `POST /api/auth/logout` - User logout

## Development

```bash
# From monorepo root
pnpm auth:migrate:dev    # Run database migrations
cd apps/auth
pnpm dev                 # Start development server

# Service runs on http://localhost:3031
```

## Environment Variables

See `.env.sample` for required configuration:

- Database connection
- Discord OAuth credentials
- JWT secrets
- Redis connection
