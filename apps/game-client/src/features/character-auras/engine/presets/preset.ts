import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import type { EmitterSpec } from "../particles";
import type { PowerFire } from "../ascend";
import type { DragonScales } from "../dragon";

/** Item rarities of the game, for when auras become rewards; admin auras stand above them. */
type AuraTier = "unique" | "heroic" | "legendary" | "mythic";

/** Signature effects drawn by the renderer on top of the shared glow and particles. */
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

/** What an aura lays over the whole map while its admin is on it (`MAP_EFFECTS`). */
export type MapEffectKind =
  | "storm"
  | "cosmos"
  | "blizzard"
  | "timestop"
  | "wireframe"
  | "power";

/** The auras made as one kit each (`KITS`). */
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

/**
 * The aura's own short animation every few seconds, like the burst of the game's animated
 * items after their rest frame.
 */
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

/** What decorates the tooltip box beyond the outline, so each aura's tip has its own look. */
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
  /** Particle colours; emitters index into it. */
  particles: readonly string[];
  /** Tight outline glow and the wide haze behind the character. */
  rim: string;
  haze: string;
  near: number;
  far: number;
  /** Haze drawn darkening (source-over) instead of adding light. */
  darkHaze?: boolean;
  /** Additive tint over the character itself, as if lit by its aura. */
  inner: number;
  /** Glow multiplier over time, around 1. */
  pulse: (time: number) => number;
  ground?: { style: GroundStyle; color: string; alpha: number };
  emitters: readonly EmitterSpec[];
  fx: readonly AuraFx[];
  burst: BurstKind;
  tip: TipDeco;
  /** Steady wind, px/s, blowing light particles (positive to the right). */
  wind?: number;
  /** Extra emitters on the tooltip only, e.g. drips off its bottom edge. */
  tipEmitters?: readonly EmitterSpec[];
  /** Nick gradient in the tooltip, three stops. */
  nick: readonly [string, string, string];
  /** Pixel outline tones, light to dark: the inner ring, the second ring, the dithered falloff. */
  tones: readonly [string, string, string];
  /**
   * Built for weak PCs: its body pieces, drawn in pixels only, skip the pixel finish
   * (`getImageData`), and they, the outline and the inner light are rebuilt on a coarse
   * animation step (or a new sprite frame, burst or flash) instead of every tick. Body
   * pieces must be pixels only; anything timed animates in those steps.
   */
  lite?: boolean;
  /** No outline or inner light round a character, only its pieces and particles. */
  bare?: boolean;
  /**
   * Admin auras: the arrival over the whole map, and the aura's burst as soon as it shows
   * (when the admin enters the map).
   */
  herald?: boolean;
  /** What the aura lays over the whole map while it is on it: a storm, a night sky. */
  sky?: MapEffectKind;
  /**
   * An aura that wears others in turn, moving on as each one's burst ends. Its own
   * looks are then never drawn: only its id, description and nick are its own.
   */
  realms?: readonly CharacterAuraId[];
  /** The kit that draws the aura's pieces, its effect over the map and its burst. */
  kit?: AuraKitId;
  /** The fire of an aura with the `power-flame` effect. */
  fire?: PowerFire;
  /** The dragon's colours, for an aura with the `dragon` effect; jade and gold otherwise. */
  dragonScales?: DragonScales;
}

export const breathe = (period: number, depth: number) => (t: number) =>
  1 + Math.sin((t / period) * Math.PI * 2) * depth;
