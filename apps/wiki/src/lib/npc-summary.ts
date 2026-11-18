import { t } from "@/i18n/messages";
import {
  formatLevel,
  getShortnameByProf,
  PROFESSION_SHORTNAMES,
} from "@lootlog/domain/profession";
import { npcKindLabel, npcKindOf } from "@/lib/npc-types";

type SummarizedNpc = {
  type: string | null;
  icon: string | null;
  lvl: number | null;
  /** The profession as the catalog names it, such as `HUNTER`; empty for most monsters. */
  prof?: string | null;
};

/**
 * An NPC's kind as players name it: its type, with a colossus named by where
 * it comes from, such as Tropiciele Herosów for a hero fought in its hideout.
 */
export const npcKind = (npc: Pick<SummarizedNpc, "type" | "icon">) => {
  const kind = npcKindOf(npc);

  return kind ? npcKindLabel(kind) : undefined;
};

/** The profession a monster fights as, in Polish; none for a monster without one. */
export const npcProfession = (prof: string | null | undefined) => {
  const shortname = getShortnameByProf(prof ?? "");
  const known = PROFESSION_SHORTNAMES.find((value) => value === shortname);

  return known ? t(`filters.professions.${known}`) : undefined;
};

/**
 * An NPC's level as the game writes it, with its profession's letter: `271h`.
 * None for an NPC whose level follows the player's.
 */
export const npcLevel = (npc: Pick<SummarizedNpc, "lvl" | "prof">) =>
  npc.lvl ? formatLevel(npc.lvl, npc.prof) : undefined;

/** An NPC's kind and level for a subtitle: `Heros · 271h`. */
export const npcSummary = (npc: SummarizedNpc) =>
  [npcKind(npc), npcLevel(npc)].filter(Boolean).join(" · ");
