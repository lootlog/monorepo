# Lootlog domain

Lootlog connects Margonem play with shared records and coordination anchored to
a Discord community. This glossary defines the language used across product,
documentation, and engineering work.

## People and groups

**User**:
A person with a Lootlog account who signs in through Discord.
_Avoid_: Discord user, account holder

**Organization**:
The top-level Lootlog group anchored to exactly one Discord server and
representing one player faction.
_Avoid_: Clan, guild, tenant

**Discord guild**:
The Discord platform entity that anchors an Organization. Use `Guild` for this
concept in code that models Discord or the current persisted organization.
_Avoid_: Margonem clan

**Margonem clan**:
An in-game clan that may belong to an Organization alongside other clans and
players without a clan.
_Avoid_: Guild, organization

**Member**:
A User whose current Discord membership makes them part of an Organization.
_Avoid_: Player

**Player**:
A Margonem character observed or selected in a game context.
_Avoid_: User, member

## Shared information

**Shared signal**:
Current or durable information produced during play and made available to an
authorized Organization audience.
_Avoid_: Notification, event

**Durable record**:
An accepted gameplay fact, such as loot, a kill, or a battle, that remains
available according to its retention policy.
_Avoid_: Signal, log

**Loot drop**:
The immutable gameplay fact describing items obtained in one encounter and the
Players and NPCs involved.
_Avoid_: Organization Loot record, Loot submission

**Loot allocation**:
The shared assignment of items from a Loot drop to the Players who received
them.
_Avoid_: Loot share, Organization settlement

**Organization Loot record**:
An Organization's record of a Loot drop.
_Avoid_: Loot drop, Loot submission

**Loot submission**:
Evidence that a Member reported a Loot drop to an Organization.
_Avoid_: Organization Loot record

**Presence**:
The expiring report of a User's current game session, character, availability,
and permitted location detail.
_Avoid_: Activity, member status

**Timer**:
An Organization record representing an estimated NPC respawn window.
_Avoid_: Countdown

**Event**:
A planned Organization activity with participants, assignments, rules, and
results.
_Avoid_: Domain event, socket event

**Reservation**:
A time-bounded claim on a map or hunting resource within an Organization.
_Avoid_: Assignment

**Reservation partnership**:
A direct, reciprocal agreement between two Organizations to disclose and
coordinate their reservation calendars.
_Avoid_: Alliance, inherited share

## Access

**Access policy**:
A named set of Lootlog capabilities and data filters mapped to one or more
Discord roles.
_Avoid_: Discord role, ACL, permission role

**Capability**:
A named action in Lootlog that an Access policy may grant to a Member.
_Avoid_: Permission, Discord permission

**Visibility**:
The result of applying an Access policy to a resource and its metadata.
_Avoid_: Read permission

**Verified presence**:
Presence backed by a current Margonem-signed proof.
_Avoid_: Trusted user

**Reported presence**:
Presence sent by an authenticated User without a current Margonem-signed proof.
_Avoid_: Untrusted presence, fake presence

## Product surfaces

**Game client**:
The Lootlog interface and capture runtime embedded in Margonem through a
supported installation method.
_Avoid_: Addon, overlay, userscript

**Web app**:
The authenticated Lootlog surface for history, analysis, configuration, and
Organization operations.
_Avoid_: Dashboard, panel

**Installation method**:
A supported way to run the Game client, such as the Tampermonkey userscript or
the planned Chrome extension.
_Avoid_: Client variant
