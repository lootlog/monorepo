export type ReferenceService = "main" | "activity" | "battlelog" | "search";

type TagMetadata = { name: string; description: string };

type ServiceMetadata = {
  description: string;
  tags: Record<string, TagMetadata>;
  /** Sidebar groups. Scalar hides a tag that no group lists. */
  groups: { name: string; tags: string[] }[];
};

const guides =
  "New here? Start with [your first request](/docs/http), then read [keys and permissions](/docs/keys), [errors, pages and limits](/docs/errors) and the [TypeScript SDK](/docs/sdk).";

const authentication =
  "Send your API key in the `X-Api-Key` header. A key reaches only the Organizations it was created for, and only what you can access there yourself. Paths and fields call an Organization's Discord server a `guild`; `guildId` is that server's ID.";

/**
 * Names, descriptions and sidebar groups for the HTTP reference. The public
 * OpenAPI documents carry only operations, so the portal adds the reading
 * order and the copy a developer needs to find them.
 */
export const referenceMetadata: Record<ReferenceService, ServiceMetadata> = {
  main: {
    description: `Organizations, Members, timers, loot, kills, events and coordination features of Lootlog.\n\n${authentication}\n\n${guides}`,
    tags: {
      users: {
        name: "Current user",
        description:
          "The signed-in user, their Organizations and their personal and game account preferences.",
      },
      "user-lootlog-config": {
        name: "Character setup",
        description:
          "Which Organizations each of the user's characters reports to.",
      },
      "sound-settings": {
        name: "Sound settings",
        description: "The user's sound settings.",
      },
      guilds: {
        name: "Organizations",
        description:
          "Organizations the user can see or manage, their configuration, worlds and permissions.",
      },
      members: {
        name: "Members",
        description:
          "Members of an Organization, their summaries and the jobs that refresh them from Discord.",
      },
      roles: {
        name: "Roles",
        description: "Discord roles of an Organization and their permissions.",
      },
      "lootlog-config": {
        name: "Lootlog configuration",
        description:
          "Organization-wide Lootlog settings, including the configuration of each NPC.",
      },
      timers: {
        name: "Timers",
        description:
          "Respawn timers of an Organization: list, create, reset and delete them, search NPCs and read timer history.",
      },
      loots: {
        name: "Loot",
        description:
          "Recorded loot, its statistics and comments, and item lookup by hash ID.",
      },
      kills: {
        name: "Kills",
        description:
          "Recorded kills, Organization rankings and personal kill statistics.",
      },
      events: {
        name: "Events",
        description:
          "Organization events with their heroes, maps, rankings, kill history and summaries.",
      },
      maps: {
        name: "Maps",
        description: "Margonem maps known to Lootlog.",
      },
      "map-templates": {
        name: "Map templates",
        description: "Reusable map sets an Organization assigns to events.",
      },
      chat: {
        name: "Chat",
        description: "The shared chat of an Organization.",
      },
      messaging: {
        name: "NPC notifications",
        description:
          "Announce a spawned NPC to Organizations and volunteer for one.",
      },
      "party-ready-room": {
        name: "Party gatherings",
        description:
          "Ready Rooms that gather a party in one Organization: applications, participants and invitations.",
      },
      reservations: {
        name: "Reservations",
        description:
          "Reservation spots and the user's reservations of them in an Organization.",
      },
      "reservation-sharing": {
        name: "Reservation sharing",
        description:
          "Share reservation calendars with partners through single-use invitations.",
      },
      notifications: {
        name: "Notification rules",
        description:
          "Discord targets, rules and scheduled jobs that send Organization and personal notifications.",
      },
      docs: {
        name: "Documents",
        description:
          "Shared documents of an Organization with their history and trash.",
      },
      "public-guild-stats-card": {
        name: "Public stats card",
        description:
          "An Organization's public loot statistics, readable without a key.",
      },
    },
    groups: [
      {
        name: "Account",
        tags: ["users", "user-lootlog-config", "sound-settings"],
      },
      {
        name: "Organizations",
        tags: ["guilds", "members", "roles", "lootlog-config"],
      },
      {
        name: "Gameplay records",
        tags: ["timers", "loots", "kills", "events", "maps", "map-templates"],
      },
      {
        name: "Coordination",
        tags: [
          "chat",
          "messaging",
          "party-ready-room",
          "reservations",
          "reservation-sharing",
          "notifications",
          "docs",
        ],
      },
      { name: "Public", tags: ["public-guild-stats-card"] },
    ],
  },
  activity: {
    description: `The activity log of an Organization, activity statistics of its Members and the user's own online time.\n\n${authentication}\n\n${guides}`,
    tags: {
      guilds: {
        name: "Organization activity",
        description:
          "Activity log entries of an Organization, filter suggestions and Member activity statistics.",
      },
      users: {
        name: "Online time",
        description:
          "The user's confirmed game online time per Warsaw calendar day.",
      },
    },
    groups: [{ name: "Activity", tags: ["guilds", "users"] }],
  },
  battlelog: {
    description: `Recorded Margonem battles of the user and their analytics. Public battle links are readable without a key.\n\n${authentication}\n\n${guides}`,
    tags: {
      battles: {
        name: "Battles",
        description:
          "The user's recorded battles, characters, Abyss seasons and combat statistics.",
      },
      "public-battles": {
        name: "Public battles",
        description:
          "Battles shared by link: details, raw payload and computed timeline.",
      },
    },
    groups: [{ name: "Battles", tags: ["battles", "public-battles"] }],
  },
  search: {
    description: `Search players, NPCs and items, and list the public item and NPC catalog.\n\n${authentication}\n\n${guides}`,
    tags: {
      Players: { name: "Players", description: "Search players by name." },
      NPCs: { name: "NPCs", description: "Search NPCs by name." },
      Items: {
        name: "Items",
        description: "Search items with filters, sorting and facets.",
      },
      All: {
        name: "All results",
        description: "Search players, NPCs and items at once.",
      },
      Catalog: {
        name: "Public catalog",
        description: "Items and NPCs of each game edition, without a key.",
      },
    },
    groups: [
      { name: "Search", tags: ["Players", "NPCs", "Items", "All"] },
      { name: "Public", tags: ["Catalog"] },
    ],
  },
};
