import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import type { EmitterSpec } from "../particles";
import type { PowerFire } from "../ascend";
import type { DragonScales } from "../dragon";

type AuraTier = "unique" | "heroic" | "legendary" | "mythic";

type AuraFx =
  | "rays"
  | "lightning"
  | "orbits"
  | "moon"
  | "heartbeat"
  | "prism"
  | "frost-shards"
  | "flicker-tongues"
  | "dust-swirl"
  | "skulls"
  | "glyph-orbit"
  | "curtain"
  | "footprints"
  | "raincloud"
  | "haki"
  | "halo"
  | "dragon"
  | "fire-dragon"
  | "crown"
  | "wings"
  | "eclipse"
  | "quake"
  | "galaxy"
  | "clockwork"
  | "winter"
  | "glitch"
  | "power-flame";

export type MapEffectKind =
  | "storm"
  | "cosmos"
  | "blizzard"
  | "timestop"
  | "wireframe"
  | "power";

export type AuraKitId =
  | "skyborne"
  | "joker"
  | "nightowl"
  | "sunder"
  | "fortyfour"
  | "thirteenth"
  | "ninepins"
  | "threefaces"
  | "twineyes"
  | "tulipwind";

export type BurstKind =
  | "descend"
  | "eruption"
  | "freeze"
  | "implode"
  | "strike"
  | "spores"
  | "bloodrain"
  | "comet"
  | "sweep"
  | "bloom"
  | "whirl"
  | "sandspout"
  | "souls"
  | "splash"
  | "ascend"
  | "aurora-flare"
  | "conqueror"
  | "roar"
  | "coronation"
  | "judgement"
  | "rebirth"
  | "quake"
  | "supernova"
  | "timestop"
  | "glaciate"
  | "reload"
  | "powerup"
  | "kit";

type GroundStyle =
  | "disc"
  | "ring"
  | "vortex"
  | "frost"
  | "rainbow"
  | "mist"
  | "runes"
  | "ripples"
  | "circle"
  | "dust"
  | "cracks"
  | "halo";

export type TipDeco =
  | "holy-corners"
  | "embers"
  | "icicles"
  | "tendrils"
  | "bolt-corners"
  | "drips"
  | "blood-drips"
  | "constellation"
  | "prism-corners"
  | "vines"
  | "blossoms"
  | "sand"
  | "skull-corners"
  | "waves"
  | "sigils"
  | "curtain"
  | "cracks"
  | "clouds"
  | "halo"
  | "crown"
  | "wings"
  | "hearts"
  | "regal"
  | "seraph"
  | "eclipse"
  | "thunder-crown"
  | "phoenix"
  | "emperor"
  | "quake"
  | "cosmos"
  | "chrono"
  | "winter"
  | "terminal"
  | "power";

export interface AuraPreset {
  id: CharacterAuraId;
  tier: AuraTier;
  description: string;
  particles: readonly string[];
  rim: string;
  haze: string;
  near: number;
  far: number;
  darkHaze?: boolean;
  inner: number;
  pulse: (time: number) => number;
  ground?: { style: GroundStyle; color: string; alpha: number };
  emitters: readonly EmitterSpec[];
  fx: readonly AuraFx[];
  burst: BurstKind;
  tip: TipDeco;
  wind?: number;
  tipEmitters?: readonly EmitterSpec[];
  nick: readonly [string, string, string];
  tones: readonly [string, string, string];
  lite?: boolean;
  bare?: boolean;
  herald?: boolean;
  sky?: MapEffectKind;
  realms?: readonly CharacterAuraId[];
  kit?: AuraKitId;
  fire?: PowerFire;
  dragonScales?: DragonScales;
}

export const breathe = (period: number, depth: number) => (t: number) =>
  1 + Math.sin((t / period) * Math.PI * 2) * depth;
