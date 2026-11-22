import type { DisplayItemRarity } from "@lootlog/domain/item-rarity";
import { mapValues } from "es-toolkit";

type ItemRarityTokens = {
  hex: string | undefined;
  frame: string;
  text: string;
  surface: string;
  pill: string;
  accent: string;
  label: string;
};

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
    hex: "#ff59af",
    frame: "border-[#ff59af] bg-card/80 shadow-[0_0_10px_rgba(255,89,175,0.4)]",
    text: "text-[#ff59af]",
    surface: "bg-[#ff59af]/10",
    pill: "text-[#ff59af] hover:text-[#ff8cc8] aria-pressed:border-[#ff59af]/80 aria-pressed:bg-[#ff59af]/15 aria-pressed:text-[#ff8cc8] aria-pressed:shadow-[0_0_12px_rgba(255,89,175,0.28)]",
    accent: "[--item-rarity:#ff59af]",
    label: "text-[#ff59af]",
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
  UPGRADED: ITEM_RARITY_TOKENS.UPGRADED.hex,
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
