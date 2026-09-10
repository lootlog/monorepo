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

## Backfill from legacy storage

`drizzle/migrations/20260910185220_settings_documents_backfill` copies
`UserGameAccountSettings` rows into documents (`pings`, `detector`, `airTags`,
`notifications` presentation per game account; global mutes from the sentinel
`__global-notification-mutes__` row). It is idempotent: `ON CONFLICT DO NOTHING`
keeps an existing document, so rerunning it never overwrites newer writes. The
migration is a single `INSERT ... SELECT` per target document type and takes a
short lock proportional to the legacy table size.

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
