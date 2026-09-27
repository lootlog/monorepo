import type { BattlePingType } from "@lootlog/schema/battle-ping";
import type { MapPingType } from "@lootlog/schema/map-ping";

export type PingType = MapPingType | BattlePingType;

/**
 * Tones follow the game's own popup-menu palette so pings read as part of
 * Margonem rather than as an overlay; violet is the game's group chat colour.
 */
export type PingTone = "gold" | "red" | "violet" | "blue" | "green";

export const PING_TONES = {
  gold: { fill: "#4a3d12", border: "#8a7424", glow: "#eddb5e" },
  red: { fill: "#4a0e0e", border: "#831f1f", glow: "#ff5a4a" },
  violet: { fill: "#341849", border: "#652f8e", glow: "#b554ff" },
  blue: { fill: "#1b3550", border: "#2f5d86", glow: "#7cc4ff" },
  green: { fill: "#244518", border: "#396420", glow: "#1ae072" },
} as const satisfies Record<
  PingTone,
  { fill: string; border: string; glow: string }
>;

/**
 * Icons are SVG path data on a 24×24 grid. The wheel renders them as SVG and
 * the map marker strokes the same data through `Path2D`.
 */
const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;

export const PING_ICONS = {
  alert: "M12 4v10M12 18.5v1",
  arrow: "M4 20L20 4M20 4h-7M20 4v7M8 16l-3-1M8 16l1 3",
  cloud: "M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A4 4 0 1 1 17 18z",
  crosshair: `${circle(12, 12, 6)}M12 2v5M12 17v5M2 12h5M17 12h5`,
  diamond: `M12 3l9 9-9 9-9-9z${circle(12, 12, 1.5)}`,
  drop: "M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z",
  fastForward: "M4 6l7 6-7 6zM13 6l7 6-7 6z",
  flame:
    "M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 2.5 2 3 4 1-2 0-5 0-8z",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  horn: "M3 10v4h4l6 4V6l-6 4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12",
  navigate: "M4 11l16-7-7 16-2-7z",
  noEntry: `${circle(12, 12, 8)}M6.5 17.5l11-11`,
  plus: "M12 5v14M5 12h14",
  regroup: `${circle(12, 12, 8)}${circle(12, 12, 3)}`,
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z",
  snowflake: "M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17",
  sparkle:
    "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",
  star: "M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z",
  swords: "M4 4l10 10M20 4L10 14M6 16l-2 4 4-2M18 16l2 4-4-2",
  warning: "M12 3L22 20H2zM12 9v5M12 17v.5",
  wave: "M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3.5-3 5-2M12 3v5M9.5 5.5h5",
} as const;

export type PingIconName = keyof typeof PING_ICONS;

type PingPresentation = {
  icon: PingIconName;
  tone: PingTone;
  /** Map pings fade after this long; battle target pings persist instead. */
  durationMs: number;
  playbackRate: number;
  translationKey: `types.${PingType}`;
};

const presentation = (
  type: PingType,
  icon: PingIconName,
  tone: PingTone,
  durationMs: number,
  playbackRate: number,
): PingPresentation => ({
  icon,
  tone,
  durationMs,
  playbackRate,
  translationKey: `types.${type}`,
});

const BATTLE_MARK_MS = 3_000;

const BATTLE_REQUEST_MS = 4_000;

export const PING_PRESENTATION = {
  attention: presentation("attention", "alert", "gold", 2_500, 1),
  enemy: presentation("enemy", "crosshair", "red", 4_000, 1.35),
  regroup: presentation("regroup", "regroup", "violet", 5_000, 0.82),
  // Shown as "Idę": the wire keeps the original `avoid` value.
  avoid: presentation("avoid", "navigate", "blue", 5_000, 1.1),
  attack: presentation("attack", "swords", "red", Infinity, 1.35),
  caution: presentation("caution", "warning", "gold", BATTLE_MARK_MS, 1.15),
  spare: presentation("spare", "noEntry", "violet", BATTLE_MARK_MS, 0.7),
  "attack-speed-aura": presentation(
    "attack-speed-aura",
    "star",
    "gold",
    BATTLE_REQUEST_MS,
    1,
  ),
  atmo: presentation("atmo", "cloud", "blue", BATTLE_REQUEST_MS, 1),
  cleanse: presentation("cleanse", "sparkle", "green", BATTLE_REQUEST_MS, 1),
  "emanating-arrow": presentation(
    "emanating-arrow",
    "arrow",
    "red",
    BATTLE_REQUEST_MS,
    1,
  ),
  fury: presentation("fury", "flame", "red", BATTLE_REQUEST_MS, 1),
  heal: presentation("heal", "plus", "green", BATTLE_REQUEST_MS, 1),
  "healing-wave": presentation(
    "healing-wave",
    "wave",
    "green",
    BATTLE_REQUEST_MS,
    1,
  ),
  "need-heal": presentation(
    "need-heal",
    "heart",
    "green",
    BATTLE_REQUEST_MS,
    1,
  ),
  poison: presentation("poison", "drop", "violet", BATTLE_REQUEST_MS, 1),
  "protection-aura": presentation(
    "protection-aura",
    "shield",
    "blue",
    BATTLE_REQUEST_MS,
    1,
  ),
  rime: presentation("rime", "snowflake", "blue", BATTLE_REQUEST_MS, 1),
  stigma: presentation("stigma", "diamond", "violet", BATTLE_REQUEST_MS, 1),
  taunt: presentation("taunt", "horn", "gold", BATTLE_REQUEST_MS, 1),
  "quick-fight": presentation(
    "quick-fight",
    "fastForward",
    "gold",
    BATTLE_REQUEST_MS,
    1,
  ),
} as const satisfies Record<PingType, PingPresentation>;

export const getPingPresentation = (type: PingType) => PING_PRESENTATION[type];

/** Played for a request that names the local hero, so it stands out. */
export const PING_REQUEST_FOR_ME_PLAYBACK_RATE = 1.5;

/** Map wheel: the centre sends `attention`, the ring starts at the top. */
export const MAP_PING_CENTRE_TYPE = "attention" satisfies MapPingType;

export const MAP_PING_RING_TYPES = [
  "enemy",
  "avoid",
  "regroup",
] as const satisfies readonly MapPingType[];

/** Over a player the centre marks them as an enemy; the ring pings the tile. */
export const MAP_PING_PLAYER_RING_TYPES = [
  "attention",
  "avoid",
  "regroup",
] as const satisfies readonly MapPingType[];

export const BATTLE_ENEMY_RING_TYPES = [
  "attack",
  "caution",
  "spare",
] as const satisfies readonly BattlePingType[];

export const BATTLE_SELF_RING_TYPES = [
  "need-heal",
] as const satisfies readonly BattlePingType[];

/** Pinged on the game's quick-fight button; it calls the whole team. */
export const BATTLE_QUICK_FIGHT_TYPE = "quick-fight" satisfies BattlePingType;

/** What an ally of each Margonem profession can be asked to cast. */
const BATTLE_PROFESSION_REQUESTS = {
  b: ["fury", "poison"],
  h: ["stigma", "cleanse"],
  m: ["atmo", "rime", "heal"],
  p: ["protection-aura", "healing-wave", "taunt"],
  t: ["attack-speed-aura", "heal", "emanating-arrow"],
  w: ["taunt"],
} as const satisfies Record<string, readonly BattlePingType[]>;

const isKnownProfession = (
  profession: string,
): profession is keyof typeof BATTLE_PROFESSION_REQUESTS =>
  Object.hasOwn(BATTLE_PROFESSION_REQUESTS, profession);

export const getBattleProfessionRequests = (
  profession: string,
): readonly BattlePingType[] =>
  isKnownProfession(profession) ? BATTLE_PROFESSION_REQUESTS[profession] : [];
