# Permissions System

This document explains how the permissions system works in Lootlog and what access each permission grants.

## Overview

Permissions in Lootlog control what actions users can perform within a guild. Permissions are assigned to **roles**, and roles are assigned to **members**. A user's effective permissions are the union of all permissions from all their assigned roles.

### Permission Resolution

The system uses a `PermissionResolver` utility that handles implicit permission grants:

1. **OWNER** and **ADMIN** have all permissions implicitly
2. **LOOTLOG_MANAGE** implies **LOOTLOG_ACCESS**
3. All other permissions must be explicitly assigned

## Permission Categories

### Administrative Permissions

| Permission       | Description                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `OWNER`          | Guild owner - has all permissions, cannot be removed. Assigned automatically to the Discord server owner. |
| `ADMIN`          | Full administrative access - can manage roles, settings, and all lootlog features.                        |
| `LOOTLOG_MANAGE` | Can moderate content (edit/delete loots, timers, comments) but cannot manage roles or guild settings.     |

---

### Access Permission

| Permission       | Description                                                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOOTLOG_ACCESS` | **Required** for basic application access. Without this permission, users cannot access the lootlog at all. This is the base permission that should be granted to all guild members who need any access. |

---

### Loot Permissions

| Permission                  | Description                                                | Endpoints Protected                                                                                             |
| --------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `LOOTLOG_LOOTS_READ`        | View loot drops and comments                               | `GET /guilds/:guildId/loots`, `GET /guilds/:guildId/loots/count`, `GET /guilds/:guildId/loots/:lootId/comments` |
| `LOOTLOG_LOOTS_WRITE`       | Create loot entries and comments                           | `POST /loots`, `POST /guilds/:guildId/loots/:lootId/comments`                                                   |
| `LOOTLOG_LOOTS_TITANS_READ` | View loot drops from **Titan** type NPCs                   | Filters loot list to show/hide Titan kills                                                                      |
| `LOOTLOG_LOOTS_HEROES_READ` | View loot drops from **Hero** and **Event Hero** type NPCs | Filters loot list to show/hide Hero kills                                                                       |

**Note:** Titan and Hero read permissions are subject to **level range** restrictions defined on the role.

---

### Timer Permissions

| Permission                   | Description                                           | Endpoints Protected                                                      |
| ---------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `LOOTLOG_TIMERS_READ`        | View boss respawn timers                              | `GET /guilds/:guildId/timers`, `GET /guilds/:guildId/timers/npcs/search` |
| `LOOTLOG_TIMERS_WRITE`       | Create new timers (manual or from game client)        | `POST /guilds/:guildId/timers`, `POST /guilds/:guildId/timers/manual`    |
| `LOOTLOG_TIMERS_RESET`       | Reset existing timers                                 | `PATCH /guilds/:guildId/timers/:npcId/reset`                             |
| `LOOTLOG_TIMERS_DELETE`      | Delete timers                                         | (Currently requires `LOOTLOG_MANAGE`)                                    |
| `LOOTLOG_TIMERS_TITANS_READ` | View timers for **Titan** type NPCs                   | Filters timer list and chat messages                                     |
| `LOOTLOG_TIMERS_HEROES_READ` | View timers for **Hero** and **Event Hero** type NPCs | Filters timer list and chat messages                                     |

**Note:** Titan and Hero timer permissions are subject to **level range** restrictions defined on the role.

---

### Reservation Permissions

| Permission                   | Description                           | Endpoints Protected                                                              |
| ---------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| `LOOTLOG_RESERVATIONS_READ`  | View item reservations                | `GET /guilds/:guildId/reservations`, `GET /guilds/:guildId/reservations/cards`   |
| `LOOTLOG_RESERVATIONS_WRITE` | Create, edit, and delete reservations | `POST /guilds/:guildId/reservations`, `DELETE /guilds/:guildId/reservations/:id` |

---

### Member Permissions

| Permission             | Description                | Endpoints Protected            |
| ---------------------- | -------------------------- | ------------------------------ |
| `LOOTLOG_MEMBERS_READ` | View list of guild members | `GET /guilds/:guildId/members` |

---

### Chat Permissions

| Permission           | Description                         | Endpoints Protected                   |
| -------------------- | ----------------------------------- | ------------------------------------- |
| `LOOTLOG_CHAT_READ`  | Read chat messages from the lootlog | WebSocket subscription to chat events |
| `LOOTLOG_CHAT_WRITE` | Send chat messages to the lootlog   | WebSocket message sending             |

**Note:** Chat messages about Titan/Hero NPCs are filtered based on the corresponding timer permissions.

---

### Notification Permissions

| Permission                   | Description                             | Endpoints Protected            |
| ---------------------------- | --------------------------------------- | ------------------------------ |
| `LOOTLOG_NOTIFICATIONS_READ` | Receive notifications from the lootlog  | Notification subscription      |
| `LOOTLOG_NOTIFICATIONS_SEND` | Send notifications (ping members, etc.) | Notification sending endpoints |

---

## Level Range Filtering

Some permissions are subject to **level range** restrictions defined on the role:

- `LOOTLOG_LOOTS_TITANS_READ` / `LOOTLOG_LOOTS_HEROES_READ`
- `LOOTLOG_TIMERS_TITANS_READ` / `LOOTLOG_TIMERS_HEROES_READ`

Each role has `lvlRangeFrom` and `lvlRangeTo` properties. For Titan/Hero content, the NPC's level must fall within this range for the user to see it.

**Example:** If a role has `lvlRangeFrom: 100` and `lvlRangeTo: 200`, users with that role can only see Titan/Hero loots and timers for NPCs between levels 100-200.

---

## Common Permission Sets

### Basic Member (Read Only)

```
LOOTLOG_ACCESS
LOOTLOG_LOOTS_READ
LOOTLOG_TIMERS_READ
LOOTLOG_MEMBERS_READ
```

### Active Contributor

```
LOOTLOG_ACCESS
LOOTLOG_LOOTS_READ
LOOTLOG_LOOTS_WRITE
LOOTLOG_TIMERS_READ
LOOTLOG_TIMERS_WRITE
LOOTLOG_RESERVATIONS_READ
LOOTLOG_RESERVATIONS_WRITE
LOOTLOG_MEMBERS_READ
LOOTLOG_CHAT_READ
LOOTLOG_CHAT_WRITE
```

### Elite Member (with Titan/Hero access)

```
(All Active Contributor permissions)
LOOTLOG_LOOTS_TITANS_READ
LOOTLOG_LOOTS_HEROES_READ
LOOTLOG_TIMERS_TITANS_READ
LOOTLOG_TIMERS_HEROES_READ
```

### Moderator

```
LOOTLOG_MANAGE
(All Elite Member permissions)
LOOTLOG_NOTIFICATIONS_READ
LOOTLOG_NOTIFICATIONS_SEND
```

---

## Permission Inheritance

```
OWNER
  └── All permissions (implicit)

ADMIN
  └── All permissions (implicit)

LOOTLOG_MANAGE
  └── LOOTLOG_ACCESS (implicit)
  └── Content moderation capabilities
```

All other permissions are independent and must be explicitly assigned.

---

## Frontend Navigation

The sidebar navigation uses permissions to show/hide menu items:

| Menu Item                       | Required Permission         |
| ------------------------------- | --------------------------- |
| Lootlog (loots list)            | `LOOTLOG_LOOTS_READ`        |
| Timery (timers)                 | `LOOTLOG_TIMERS_READ`       |
| Rezerwacje (reservations)       | `LOOTLOG_RESERVATIONS_READ` |
| Statystyki (statistics)         | `LOOTLOG_LOOTS_READ`        |
| Logi aktywności (activity logs) | `ADMIN`                     |
| Ustawienia (settings)           | `ADMIN`                     |

---

## API Guard Implementation

Permissions are enforced using the `@Permissions()` decorator and `PermissionsGuard`:

```typescript
@Permissions(Permission.LOOTLOG_LOOTS_READ)
@UseGuards(PermissionsGuard)
@Get('/guilds/:guildId/loots')
async getLoots() { ... }
```

The guard:

1. Extracts the user's Discord ID from the JWT token
2. Fetches the user's roles for the guild
3. Collects all permissions from all roles
4. Resolves implicit permissions via `PermissionResolver`
5. Checks if any required permission is present
6. Returns 403 Forbidden if not authorized
