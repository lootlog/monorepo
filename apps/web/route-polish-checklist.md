# Default v2 route polish checklist

This inventory tracks every file-based route module. `__root` is included as the shared shell foundation; the remaining modules inherit the Default v2 page frame, panels, controls, states, and responsive behavior.

## Shell and entry/public

- [x] `__root`
- [x] `_authenticated`
- [x] `signin`
- [x] `init`
- [x] `battles.$id`

## User workspace

- [x] `_authenticated/@me`
- [x] `_authenticated/@me/index`
- [x] `_authenticated/@me/kills`
- [x] `_authenticated/@me/notifications`
- [x] `_authenticated/@me/battle-panel`
- [x] `_authenticated/@me/battle-panel/index`
- [x] `_authenticated/@me/battle-panel/abyss`
- [x] `_authenticated/@me/battle-panel/abyss_.h2h`
- [x] `_authenticated/@me/battle-panel/battles_.$battleId`
- [x] `_authenticated/@me/battle-panel/statistics`
- [x] `_authenticated/@me/battle-panel/statistics_.h2h`
- [x] `_authenticated/@me/battle-panel/statistics_.matchmaking-h2h`
- [x] `_authenticated/@me/battle-panel/statistics_.player-vs-player.$myId.$opponentId`
- [x] `_authenticated/@me/settings`
- [x] `_authenticated/@me/settings/index`
- [x] `_authenticated/@me/settings/account`
- [x] `_authenticated/@me/settings/appearance`
- [x] `_authenticated/@me/settings/servers`

## Guild workspace

- [x] `_authenticated/$guildId`
- [x] `_authenticated/$guildId/index`
- [x] `_authenticated/$guildId/activity-logs`
- [x] `_authenticated/$guildId/timers`
- [x] `_authenticated/$guildId/docs`
- [x] `_authenticated/$guildId/docs/index`
- [x] `_authenticated/$guildId/docs/$docId`
- [x] `_authenticated/$guildId/reservations`
- [x] `_authenticated/$guildId/reservations/index`
- [x] `_authenticated/$guildId/reservations/$reservationId`

## Events and notifications

- [x] `_authenticated/$guildId/events`
- [x] `_authenticated/$guildId/events_.$eventId`
- [x] `_authenticated/$guildId/events_.$eventId/index`
- [x] `_authenticated/$guildId/events_.$eventId_.coordination`
- [x] `_authenticated/$guildId/events_.$eventId_.kills`
- [x] `_authenticated/$guildId/events_.$eventId_.ranking`
- [x] `_authenticated/$guildId/events_.$eventId_.heroes_.$heroId`
- [x] `_authenticated/$guildId/events_.$eventId_.heroes_.$heroId_.kills`
- [x] `_authenticated/$guildId/events_.$eventId_.heroes_.$heroId_.kills_.$killId`
- [x] `_authenticated/$guildId/events_.$eventId_.members_.$memberId`
- [x] `_authenticated/$guildId/events_.$eventId_.edit`
- [x] `_authenticated/$guildId/events_.$eventId_.edit/index`
- [x] `_authenticated/$guildId/events_.$eventId_.edit/rulebook`
- [x] `_authenticated/$guildId/events_.$eventId_.edit/scoring`
- [x] `_authenticated/$guildId/events_.$eventId_.edit/settings`
- [x] `_authenticated/$guildId/notifications`
- [x] `_authenticated/$guildId/notifications/index`
- [x] `_authenticated/$guildId/notifications/history`
- [x] `_authenticated/$guildId/notifications/create`
- [x] `_authenticated/$guildId/notifications/$ruleId`

## Statistics

- [x] `_authenticated/$guildId/stats`
- [x] `_authenticated/$guildId/stats/index`
- [x] `_authenticated/$guildId/stats/kills`
- [x] `_authenticated/$guildId/stats/loots`
- [x] `_authenticated/$guildId/stats/ranking`
- [x] `_authenticated/$guildId/stats/npcs.index`
- [x] `_authenticated/$guildId/stats/npcs.$npcId`
- [x] `_authenticated/$guildId/stats/members.$memberId`

## Guild settings

- [x] `_authenticated/$guildId/settings`
- [x] `_authenticated/$guildId/settings/index`
- [x] `_authenticated/$guildId/settings/info`
- [x] `_authenticated/$guildId/settings/map-templates`
- [x] `_authenticated/$guildId/settings/members`
- [x] `_authenticated/$guildId/settings/members_.$memberId`
- [x] `_authenticated/$guildId/settings/npcs`
- [x] `_authenticated/$guildId/settings/npcs_.$npcId`
- [x] `_authenticated/$guildId/settings/reservations`
- [x] `_authenticated/$guildId/settings/roles`
- [x] `_authenticated/$guildId/settings/roles_.$roleId`

## Review matrix

The shared foundations were verified for desktop and mobile layout behavior across loading, empty, error, success, disabled, permission-limited, long-content, keyboard-focus, and reduced-motion states. Dynamic detail routes require valid guild, event, hero, kill, member, reservation, document, NPC, role, and battle fixture IDs during live screenshot review.
