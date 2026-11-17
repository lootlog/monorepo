import type { DisplayItemRarity } from "@lootlog/domain/item-rarity";
import { mapValues } from "es-toolkit";

type ItemRarityTokens = {
  /** Hex accent where a class cannot reach, such as charts and link previews. */
  hex: string | undefined;
  /** Item frame drawn by `ItemImage`. */
  frame: string;
  /** Rarity-coloured text, such as item names. */
  text: string;
  /** Faint rarity-tinted background behind a rarity label or icon. */
  surface: string;
  /**
   * Rarity filter pill: the label in the frame colour, and once pressed the
   * frame itself with a faint glow, as the item frames draw it.
   */
  pill: string;
  /** Tints the tooltip frame and header ornament through `--item-rarity`. */
  accent: string;
  /** The rarity label inside an item tooltip. */
  label: string;
};

/** The rarity palette: legendary orange-600, heroic blue-500, unique amber-300. */
const ITEM_RARITY_TOKENS = {
  LEGENDARY: {
    hex: "#ea580c",
    frame: "border-orange-600 bg-card/80 shadow-[0_0_12px_rgba(234,88,12,0.5)]",
    text: "text-orange-600",
    surface: "bg-orange-600/10",
    pill: "text-orange-500 hover:text-orange-400 aria-pressed:border-orange-600/80 aria-pressed:bg-orange-600/15 aria-pressed:text-orange-400 aria-pressed:shadow-[0_0_12px_rgba(234,88,12,0.28)]",
    accent: "[--item-rarity:#ea580c]",
    label: "text-orange-400",
  },
  HEROIC: {
    hex: "#3b82f6",
    frame: "border-blue-500 bg-card/80 shadow-[0_0_10px_rgba(59,130,246,0.4)]",
    text: "text-blue-500",
    surface: "bg-blue-500/10",
    pill: "text-blue-400 hover:text-blue-300 aria-pressed:border-blue-500/80 aria-pressed:bg-blue-500/15 aria-pressed:text-blue-300 aria-pressed:shadow-[0_0_12px_rgba(59,130,246,0.28)]",
    accent: "[--item-rarity:#3b82f6]",
    label: "text-blue-400",
  },
  UNIQUE: {
    hex: "#fcd34d",
    frame: "border-amber-300 bg-card/80 shadow-[0_0_10px_rgba(252,211,77,0.4)]",
    text: "text-amber-300",
    surface: "bg-amber-300/10",
    pill: "text-amber-300 hover:text-amber-200 aria-pressed:border-amber-300/80 aria-pressed:bg-amber-300/12 aria-pressed:text-amber-200 aria-pressed:shadow-[0_0_12px_rgba(252,211,77,0.22)]",
    accent: "[--item-rarity:#fcd34d]",
    label: "text-amber-300",
  },
  UPGRADED: {
    hex: undefined,
    frame: "border-primary/40 bg-muted/50",
    text: "text-primary",
    surface: "bg-primary/10",
    pill: "",
    accent: "[--item-rarity:var(--primary)]",
    label: "text-primary",
  },
  COMMON: {
    hex: undefined,
    frame: "border-border/50 bg-muted/30",
    text: "text-muted-foreground",
    surface: "bg-muted/30",
    pill: "",
    accent: "[--item-rarity:var(--muted-foreground)]",
    label: "text-muted-foreground",
  },
} satisfies Record<DisplayItemRarity, ItemRarityTokens>;

export const LOOT_RARITY_COLORS = {
  LEGENDARY: ITEM_RARITY_TOKENS.LEGENDARY.hex,
  HEROIC: ITEM_RARITY_TOKENS.HEROIC.hex,
  UNIQUE: ITEM_RARITY_TOKENS.UNIQUE.hex,
} as const satisfies Partial<Record<DisplayItemRarity, string>>;

export const ITEM_RARITY_FRAME_CLASS = mapValues(
  ITEM_RARITY_TOKENS,
  (tokens) => tokens.frame,
);

export const LOOT_RARITY_TEXT_CLASS = mapValues(
  ITEM_RARITY_TOKENS,
  (tokens) => tokens.text,
);

export const LOOT_RARITY_SURFACE_CLASS = mapValues(
  ITEM_RARITY_TOKENS,
  (tokens) => tokens.surface,
);

export const LOOT_RARITY_PILL_CLASS = mapValues(
  ITEM_RARITY_TOKENS,
  (tokens) => tokens.pill,
);

export const ITEM_RARITY_STYLES = mapValues(
  ITEM_RARITY_TOKENS,
  ({ accent, label }) => ({ accent, label }),
);
