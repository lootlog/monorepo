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
  prof?: string | null;
};

export const npcKind = (npc: Pick<SummarizedNpc, "type" | "icon">) => {
  const kind = npcKindOf(npc);

  return kind ? npcKindLabel(kind) : undefined;
};

export const npcProfession = (prof: string | null | undefined) => {
  const shortname = getShortnameByProf(prof ?? "");
  const known = PROFESSION_SHORTNAMES.find((value) => value === shortname);

  return known ? t(`filters.professions.${known}`) : undefined;
};

export const npcLevel = (npc: Pick<SummarizedNpc, "lvl" | "prof">) =>
  npc.lvl ? formatLevel(npc.lvl, npc.prof) : undefined;

export const npcSummary = (npc: SummarizedNpc) =>
  [npcKind(npc), npcLevel(npc)].filter(Boolean).join(" · ");
