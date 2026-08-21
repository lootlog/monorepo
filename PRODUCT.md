# Lootlog product direction

Lootlog is an open-source Margonem companion that connects an in-game client
with a shared web workspace. It turns supported gameplay events into current,
durable information that players can use without copying timers, loot records,
or coordination state by hand.

This document defines the target product for the next 12–24 months. It is the
canonical product source. Application-specific `PRODUCT.md` files describe only
the responsibilities and constraints of their surface.

## Product model

Lootlog serves two connected needs:

- an individual player gets useful in-game tools and a durable record of play;
- an organized group turns records from many players into shared awareness,
  communication, coordination, and analysis.

Adoption is organization-led. A leader installs the Lootlog bot on an existing
Discord server and configures the organization. Existing server members then
see the organization after signing in at lootlog.pl. A member must still receive
useful in-game feedback during the first session; the player is not merely a
data source for administrators.

The primary daily user is an active member of an organized Margonem group. The
adoption decision-maker is a leader, deputy, or tactician. Players focused on
personal PvP analysis are an important secondary audience.

## Core problem

Lootlog must create the most useful and trustworthy shared account of what
happened in Margonem. Coordination, analytics, and administration depend on
that account. If capture or synchronization is incomplete, stale, or hard to
trust, the rest of the product loses its value.

## Product pillars

### Live awareness and communication

Timers, NPC information, chat, notifications, presence, map pings, and group
state help members understand what is happening now without leaving the game.

### Automatic durable records

Loot, kills, battles, and activity become durable records. A record accepted by
the service must not disappear silently, and a retry must not create an
unintended duplicate.

### Coordination and review

Reservations, events, assignments, rankings, and analysis turn current and
historical records into group decisions.

## Domain and identity

A Lootlog organization corresponds to one Discord server and represents one
player faction. It may include several Margonem clans, worlds, alliances, and
players without a clan.

Discord is the only supported sign-in provider. Lootlog keeps an internal user
identifier and treats the Discord account as the required identity connection.
Discord supplies organization membership and roles. Lootlog maps Discord roles
to access policies; it does not maintain independent per-user grants.

In code, `Guild` means the Discord guild that anchors a Lootlog organization.
In user-facing copy, prefer the server name, “serwer Discord”, or “organizacja
Lootloga” when the distinction matters. Reserve “klan” for a Margonem clan.

The complete vocabulary lives in [`CONTEXT.md`](CONTEXT.md).

## Data and access

The organization is the top-level security boundary. World and Margonem clan
are filters by default, not separate tenants. Selected resources may be limited
to a world, clan, role, or configured access policy.

Access policies may select NPCs by type, group, level range, and explicit
inclusions or exclusions. The same policy must cover lists, details, search,
statistics, history, comments, socket events, and notifications. An operation
on an existing resource requires both visibility and the relevant action
permission.

Personal preferences and private battles remain under the player's control.
Records deliberately submitted to an organization remain part of its history
after the player leaves. A public battle requires an explicit choice and can be
made private again.

One loot drop may be referenced by several organizations. The immutable fact
can be shared, but comments, settlement, visibility, and organization-specific
annotations belong to each organization.

Notifications inherit the access policy of their source. When an administrator
deliberately maps a policy or notification type to a Discord channel, Discord
controls the channel audience after delivery.

## Presence

Presence should be as close to current truth as the environment allows.
Clients publish to organizations selected from a safe default based on the
current Margonem clan. Users can change the selected organizations and must be
able to see where they are publishing.

Basic online state and precise location are separate capabilities. Event views
consume the viewer's existing presence access; event access does not grant
location access. Without presence access, the event remains usable and explains
why live status is unavailable.

Presence uses heartbeat, expiry, and last-seen semantics. A Margonem-signed
proof increases confidence but remains optional because the upstream proof can
be unavailable. The UI distinguishes verified state from authenticated but
self-reported state without disabling core coordination during an upstream
outage.

## Product surfaces

- **Game client:** live awareness, chat, notifications, timers, presence,
  capture, and small coordination actions.
- **Web:** history, analysis, configuration, roles, organization administration,
  documents, event preparation, and complex operations.
- **Landing:** adoption and trust for leaders and players.
- **Docs:** the supported user guide.
- **Wiki:** public Margonem knowledge and discovery; it never exposes private
  organization data.
- **Discord bot:** organization installation, membership and role
  synchronization, notifications, and a small set of Discord-native commands.
- **Developer portal:** a future surface that launches only with a supported,
  versioned API, scoped credentials, limits, examples, and a compatibility
  policy.

The responsive web app supports core mobile workflows. A native mobile app is
not planned. The Tampermonkey userscript and planned Chrome extension are two
ways to run the same client and must reach full feature and protocol parity.

## Feature lifecycle

Every feature is classified as `core`, `supporting`, `experimental`, or
`deprecated`.

- Core features implement one of the three product pillars.
- Supporting features make a core workflow safer, clearer, or easier to adopt.
- Experimental features require a hypothesis, owner, metric, cost, review date,
  and exit decision.
- Deprecated features have an explicit removal path.

Party finder, ready rooms, air tags, the Chrome extension until parity, and the
future public API start as experimental. Organization documents remain a small
supporting feature rather than a general-purpose collaborative editor.

## Success measures

The primary KPI is weekly active organizations. An organization counts as
active when at least three members participate, the game client sends or
receives shared state, and another member consumes or acts on that state.

Supporting measures include valuable weekly active users, leader activation,
member activation, organization retention, synchronization quality, and the
share of users active in the game client, web app, or both. A valuable user
action sends or consumes live state, changes coordination state, or submits or
analyzes a durable record. A login alone does not count.

Public adoption claims require a documented definition, source, owner, and
verification date. Lootlog does not publish testimonials.

## Reliability and performance

The product resolves architectural trade-offs in this order:

1. do not interfere with Margonem and do not lose accepted durable data;
2. preserve game-client performance;
3. preserve security and organization isolation;
4. preserve real-time reliability;
5. control infrastructure cost;
6. preserve development speed and maintainability;
7. preserve abstract future flexibility.

Normal play should not feel slower with Lootlog enabled. Client performance is
a release gate. Under pressure, the client may reduce supporting refreshes or
visual work, but must preserve bounded event capture, chat, notifications, and
timers. The UI must disclose degraded or stale state.

Durable capture is idempotent. Chat, timers, and notifications target low
single-digit-second delivery during normal operation. Presence and ephemeral
pings may expire, but stale state must not be presented as current.

The free hosted service is best effort and has no contractual SLA. That does
not permit silent data loss or false synchronization state.

## Sustainability

Lootlog keeps an open-source, self-hostable core and a useful free hosted tier.
Self-hosting is community-supported until a tested production package exists.

Individual and organization plans may fund longer retention, higher limits,
managed convenience, and advanced analysis. Payment never buys faster core
real-time delivery, weaker privacy, stronger permissions, access to another
party's data, ranking influence, or an in-game advantage.

Retention varies by data category and plan. Data can move from active storage
to recoverable archive and later to aggregates or deletion. Users must be told
before irreversible deletion and must be able to export eligible data. Prices,
limits, and exact retention periods are deliberately deferred decisions.

## Roadmap order

1. **Trust the signal:** client performance, consistent authorization, leak
   prevention, quality gates, reliability, and canonical documentation.
2. **Live together:** chat channels, explicit outbound Discord messages,
   presence, reconnect behavior, and notifications.
3. **Capture what matters:** improve loot, battle, and activity records and
   version data needed by a future simulator.
4. **Coordinate clearly:** simplify events, reservations, assignments,
   rankings, and mobile workflows.
5. **Sustain the product:** retention, archive, plans, and cost controls.
6. **Open the ecosystem:** supported API credentials, developer portal, and a
   later battle simulator.

Battle capture may cover many fight types. Advanced analysis remains focused on
PvP until the recorded model is complete enough for wider analysis. A future
simulator may support deterministic replay, what-if analysis, and external API
use, but it does not drive in-game actions.

## Non-goals for this horizon

Lootlog does not:

- support games other than Margonem;
- automate movement, combat, or decisions for the player;
- claim official approval or guaranteed compliance from Garmory;
- replace Discord or a general-purpose document editor;
- provide a native mobile application;
- promise supported production self-hosting;
- promise a public API before its launch criteria are met;
- maintain every historical feature without evidence of use or strategic value;
- support a user-facing language other than Polish;
- add services without a documented boundary and cost justification;
- publish metrics or product claims without auditable evidence.

## Product governance

The project owner decides product direction, security posture, and roadmap.
Contributors propose large changes through an issue, RFC, or ADR that states the
problem, affected pillar, cost, and measure of success. Merging code does not by
itself make a feature part of the supported product.

Product and user documentation are written in Polish. Code, API contracts,
architecture documents, ADRs, pull requests, and agent instructions are written
in English. User-facing strings remain behind i18n even while Polish is the only
supported language.
