# Event kill history

`makeEventKillHistory` owns authorized lists, details and timelines. It resolves
the Organization, event, visible heroes and optional member before selecting a
page or reading the 10-second list cache. Lists use `(killedAt DESC, id DESC)`
and a matching tuple continuation condition.

The new `GET /guilds/:guildId/events/:eventId/kill-history` endpoint returns
compact event or member summaries. Its page, participant counts, per-hero kill
numbers and selected member's points come from one SQL statement. Versioned
cursors carry the boundary and filter scope, so continuing does not require the
boundary row to exist. Each request applies current permissions; pagination
does not freeze a snapshot.

Details and timelines keep their deployed contracts and remain uncached. They
use separate projections, preserving saved points, snapshots, fallbacks and
the existing distinction between closure time and the end of scoring.
