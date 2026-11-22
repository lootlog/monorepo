import type { CatalogControllerGetNpcsParams } from "@lootlog/client/catalog";
import {
  type BossOrigin,
  bossOrigin,
  type OriginBossType,
} from "@lootlog/domain/npc-type";
import type { AppearanceNpcType } from "@lootlog/schema/npc-appearance";
import { npcTypeColorStyle } from "@lootlog/ui/lib/npc-type-colors";
import { t } from "@/i18n/messages";

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

export const npcKindColorStyle = (kind: NpcKind) => {
  const type = KIND_COLOR_TYPES[kind];

  return type ? npcTypeColorStyle(type) : undefined;
};

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

export type NpcEventChoice = "" | "exclude" | "only";

type NpcCatalogFilter = Pick<
  CatalogControllerGetNpcsParams,
  "types" | "bossOrigins"
>;

type EventFilters = Record<NpcEventChoice, NpcCatalogFilter>;

const bossEventFilters = (type: OriginBossType): EventFilters => ({
  "": { types: [type] },
  exclude: { types: [type], bossOrigins: ["REGULAR"] },
  only: { types: [type], bossOrigins: ["EVENT", "HERO_TRACKERS"] },
});

const EVENT_FILTERS: Partial<Record<NpcFilterType, EventFilters>> = {
  TITAN: bossEventFilters("TITAN"),
  COLOSSUS: bossEventFilters("COLOSSUS"),
  HERO: {
    "": { types: ["HERO", "EVENT_HERO"] },
    exclude: { types: ["HERO"] },
    only: { types: ["EVENT_HERO"] },
  },
};

const ANY_TYPE_FILTERS: EventFilters = {
  "": {},
  exclude: { types: [...NPC_TYPE_OPTIONS], bossOrigins: ["REGULAR"] },
  only: {
    types: ["TITAN", "COLOSSUS", "EVENT_HERO"],
    bossOrigins: ["EVENT", "HERO_TRACKERS"],
  },
};

export const hasEventMonsters = (type: NpcFilterType | undefined) =>
  type === undefined || EVENT_FILTERS[type] !== undefined;

export const npcCatalogFilter = (
  type: NpcFilterType | undefined,
  events: NpcEventChoice,
): NpcCatalogFilter => {
  if (type === undefined) return ANY_TYPE_FILTERS[events];

  return EVENT_FILTERS[type]?.[events] ?? { types: [type] };
};

type NpcKindSearch = { types: NpcFilterType; events: NpcEventChoice };

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
