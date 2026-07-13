import type { MapPingType } from "@lootlog/types";

export type MapPingSymbol = "exclamation" | "crosshair" | "regroup" | "avoid";

type MapPingPresentation = {
  color: string;
  durationMs: number;
  sound: {
    key: "mapPing";
    playbackRate: number;
    preservesPitch: false;
  };
  symbol: MapPingSymbol;
  translationKey: `mapPings.types.${MapPingType}`;
};

export const MAP_PING_PRESENTATION = {
  attention: {
    color: "#f59e0b",
    durationMs: 2_500,
    sound: { key: "mapPing", playbackRate: 1, preservesPitch: false },
    symbol: "exclamation",
    translationKey: "mapPings.types.attention",
  },
  enemy: {
    color: "#ef4444",
    durationMs: 4_000,
    sound: { key: "mapPing", playbackRate: 1.35, preservesPitch: false },
    symbol: "crosshair",
    translationKey: "mapPings.types.enemy",
  },
  regroup: {
    color: "#3b82f6",
    durationMs: 5_000,
    sound: { key: "mapPing", playbackRate: 0.82, preservesPitch: false },
    symbol: "regroup",
    translationKey: "mapPings.types.regroup",
  },
  avoid: {
    color: "#a855f7",
    durationMs: 5_000,
    sound: { key: "mapPing", playbackRate: 0.62, preservesPitch: false },
    symbol: "avoid",
    translationKey: "mapPings.types.avoid",
  },
} as const satisfies Record<MapPingType, MapPingPresentation>;

export const MAP_PING_WHEEL_SEGMENTS = [
  { type: "attention", angle: -90 },
  { type: "enemy", angle: 0 },
  { type: "avoid", angle: 90 },
  { type: "regroup", angle: 180 },
] as const satisfies ReadonlyArray<{ type: MapPingType; angle: number }>;

export const getMapPingPresentation = (type: MapPingType) =>
  MAP_PING_PRESENTATION[type];
