# Settings documents

`UserSettingDocument` is the only store for user settings that the Game client
edits. Every domain, field, default, allowed scope, and validator is declared in
`packages/domain/src/settings-documents.ts` (`SETTINGS_CATALOG`). Clients read
and write through `GET/PATCH /preferences`; the resolver layers `USER`,
`GAME_ACCOUNT`, `CHARACTER`, and `GUILD` documents in scope order.

## Single writer

Only `settings-documents.service.ts` writes `UserSettingDocument`. The routes
below are compatibility façades that translate to the same service and exist
for deployed userscripts and public API keys. They are marked deprecated in the
OpenAPI description and can be removed once no deployed client calls them:

| Route                                                          | Backing documents                                                          |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `GET/PATCH /users/@me/preferences` (`mutes`, `chatAppearance`) | `notifications`/`USER`, `appearance`/`USER`                                |
| `GET/PATCH /users/@me/game-preferences/accounts/{accountId}`   | `gameData`/`GAME_ACCOUNT`, `notifications`/`GAME_ACCOUNT` (`presentation`) |
| `GET/PATCH /sound-settings`                                    | `sounds`/`USER`                                                            |
| `GET/PATCH /timer-settings*`, `POST /timer-settings/migrate`   | `timers`, `appearance.timers.*`                                            |

`guildsOrder`, `hiddenGuildIds`, and `theme` stay on `UserSettings`: they are
account settings owned by the Web app with direct database readers. The catalog
field `general.guildsOrder` is declared but never written; do not add a second
writer for it. `timers.syncEnabled` is kept only for old clients; the current
Game client always synchronizes timer settings and never writes the field.

## Document schema versions

`notifications` is at schema version 2. Version 1 stored a server list inside
every notification type (`presentation.HERO.guildIds`); version 2 keeps one
shared `presentation.guildIds`. The catalog migration lifts the union of the
old lists on every read, and the repository migrates a stored document before
applying a patch, so the first write after the upgrade persists the current
shape and drops the per-type lists. Documents that are never written again stay
at version 1 on disk and are migrated on read; the migration can be removed once
no version 1 rows remain.

## Backfill from legacy storage

`drizzle/migrations/20260910185220_settings_documents_backfill` copies
`UserGameAccountSettings` rows into documents (`pings`, `detector`, `airTags`,
`notifications` presentation per game account; global mutes from the sentinel
`__global-notification-mutes__` row). It is idempotent and the newer side wins:
a legacy row updated after the existing document merges its keys over that
document (earlier dual-written documents stopped receiving writes while the
legacy routes kept accepting them), a document updated after the legacy row is
kept, and rerunning changes nothing because equal timestamps never satisfy the
update predicate. The migration is a single `INSERT ... SELECT` per target
document type and takes a short lock proportional to the legacy table size.

Deploy the API with this migration before shipping a Game client that writes
`notifications` or `gameData` documents directly. Otherwise a client document
would be created first and the legacy row would be skipped by the backfill.

`UserGameAccountSettings` is not dropped: an older API revision still reads it
during rollback. Remove the table (and the account-deletion cascade entry) once
no deployed revision references it.

## Client-side import

Values that were only stored in the browser (timers, hotkeys, world selection,
battle panel collection) are imported once by the Game client into documents
when the server holds only catalog defaults for the field. The server never
merges local state; the client marks each imported domain as done and the
server copy wins afterwards.
