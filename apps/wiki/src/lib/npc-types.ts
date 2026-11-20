import type { CatalogControllerGetNpcsParams } from "@lootlog/client/catalog";
import {
  type BossOrigin,
  bossOrigin,
  type OriginBossType,
} from "@lootlog/domain/npc-type";
import type { AppearanceNpcType } from "@lootlog/schema/npc-appearance";
import { npcTypeColorStyle } from "@lootlog/ui/lib/npc-type-colors";
import { t } from "@/i18n/messages";

/**
 * The kinds of NPC players tell apart, strongest first. They are the
 * catalog's types with the titans and colossi split by where they come from:
 * the game's own, an event's, and the heroes fought as colossi in their
 * hideouts during Tropiciele Herosów. The Hero Tracker type is the NPC that
 * opens a hideout, which the catalog lists among the NPCs.
 */
const NPC_KIND_OPTIONS = [
  "TITAN",
  "EVENT_TITAN",
  "COLOSSUS",
  "EVENT_COLOSSUS",
  "HERO_TRACKERS",
  "HERO",
  "EVENT_HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
  "NPC",
] as const;

export type NpcKind = (typeof NPC_KIND_OPTIONS)[number];

const BOSS_KINDS = {
  TITAN: { REGULAR: "TITAN", EVENT: "EVENT_TITAN" },
  COLOSSUS: {
    REGULAR: "COLOSSUS",
    HERO_TRACKERS: "HERO_TRACKERS",
    EVENT: "EVENT_COLOSSUS",
  },
} as const satisfies Record<
  OriginBossType,
  Partial<Record<BossOrigin, NpcKind>>
>;

const isOriginBossType = (type: string | null): type is OriginBossType =>
  type !== null && type in BOSS_KINDS;

/** The kind of an NPC of the catalog; none for a type the wiki does not list. */
export const npcKindOf = (npc: {
  type: string | null;
  icon: string | null;
}): NpcKind | undefined => {
  if (isOriginBossType(npc.type)) {
    const kinds: Partial<Record<BossOrigin, NpcKind>> = BOSS_KINDS[npc.type];

    return kinds[bossOrigin(npc.type, npc.icon ?? "")] ?? kinds.EVENT;
  }

  return NPC_KIND_OPTIONS.find((kind) => kind === npc.type);
};

export const npcKindLabel = (kind: NpcKind) => {
  if (kind === "EVENT_TITAN") return t("npc.eventTitan");

  if (kind === "EVENT_COLOSSUS") return t("npc.eventColossus");

  if (kind === "HERO_TRACKERS") return t("npc.heroTrackers");

  return t(`npcTypes.${kind}`);
};

// A boss keeps its type's colour wherever it comes from, as in Lootlog, where
// an event's titan or colossus is the same type; common monsters and NPCs have none.
const KIND_COLOR_TYPES: Partial<Record<NpcKind, AppearanceNpcType>> = {
  TITAN: "TITAN",
  EVENT_TITAN: "TITAN",
  COLOSSUS: "COLOSSUS",
  EVENT_COLOSSUS: "COLOSSUS",
  HERO_TRACKERS: "COLOSSUS",
  HERO: "HERO",
  EVENT_HERO: "EVENT_HERO",
  ELITE3: "ELITE3",
  ELITE2: "ELITE2",
  ELITE: "ELITE",
};

/** Sets `--npc-type` to the colour Lootlog gives the kind; none for a kind without one. */
export const npcKindColorStyle = (kind: NpcKind) => {
  const type = KIND_COLOR_TYPES[kind];

  return type ? npcTypeColorStyle(type) : undefined;
};

/**
 * The types a search filters by, strongest first. Whether a monster belongs
 * to an event is a filter of its own beside them, so an event's titan, colossus
 * or hero is found under its type.
 */
export const NPC_TYPE_OPTIONS = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
  "NPC",
] as const satisfies ReadonlyArray<NpcKind>;

export type NpcFilterType = (typeof NPC_TYPE_OPTIONS)[number];

export const isNpcFilterType = (value: unknown): value is NpcFilterType =>
  NPC_TYPE_OPTIONS.some((type) => type === value);

/** Whether event monsters show: all of them, none (`exclude`) or only them (`only`). */
export type NpcEventChoice = "" | "exclude" | "only";

type NpcCatalogFilter = Pick<
  CatalogControllerGetNpcsParams,
  "types" | "bossOrigins"
>;

type EventFilters = Record<NpcEventChoice, NpcCatalogFilter>;

// A boss of an event is told by its graphic; the heroes of Tropiciele
// Herosów are an event's colossi.
const bossEventFilters = (type: OriginBossType): EventFilters => ({
  "": { types: [type] },
  exclude: { types: [type], bossOrigins: ["REGULAR"] },
  only: { types: [type], bossOrigins: ["EVENT", "HERO_TRACKERS"] },
});

/** The catalog filters of each type that has monsters of events. */
const EVENT_FILTERS: Partial<Record<NpcFilterType, EventFilters>> = {
  TITAN: bossEventFilters("TITAN"),
  COLOSSUS: bossEventFilters("COLOSSUS"),
  HERO: {
    "": { types: ["HERO", "EVENT_HERO"] },
    exclude: { types: ["HERO"] },
    only: { types: ["EVENT_HERO"] },
  },
};

/** The catalog filters of every type at once. */
const ANY_TYPE_FILTERS: EventFilters = {
  "": {},
  exclude: { types: [...NPC_TYPE_OPTIONS], bossOrigins: ["REGULAR"] },
  only: {
    types: ["TITAN", "COLOSSUS", "EVENT_HERO"],
    bossOrigins: ["EVENT", "HERO_TRACKERS"],
  },
};

/**
 * Whether the type has monsters of events to show or hide. Elites, common
 * monsters and NPCs have none the catalog can tell apart.
 */
export const hasEventMonsters = (type: NpcFilterType | undefined) =>
  type === undefined || EVENT_FILTERS[type] !== undefined;

/** The catalog filters of a type, or of every type, and an event choice. */
export const npcCatalogFilter = (
  type: NpcFilterType | undefined,
  events: NpcEventChoice,
): NpcCatalogFilter => {
  if (type === undefined) return ANY_TYPE_FILTERS[events];

  return EVENT_FILTERS[type]?.[events] ?? { types: [type] };
};

type NpcKindSearch = { types: NpcFilterType; events: NpcEventChoice };

/** The search that lists monsters like one of a kind: its type, of an event or not. */
const KIND_SEARCHES: Record<NpcKind, NpcKindSearch> = {
  TITAN: { types: "TITAN", events: "exclude" },
  EVENT_TITAN: { types: "TITAN", events: "only" },
  COLOSSUS: { types: "COLOSSUS", events: "exclude" },
  EVENT_COLOSSUS: { types: "COLOSSUS", events: "only" },
  HERO_TRACKERS: { types: "COLOSSUS", events: "only" },
  HERO: { types: "HERO", events: "exclude" },
  EVENT_HERO: { types: "HERO", events: "only" },
  ELITE3: { types: "ELITE3", events: "" },
  ELITE2: { types: "ELITE2", events: "" },
  ELITE: { types: "ELITE", events: "" },
  COMMON: { types: "COMMON", events: "" },
  NPC: { types: "NPC", events: "" },
};

export const npcKindSearch = (kind: NpcKind) => KIND_SEARCHES[kind];
