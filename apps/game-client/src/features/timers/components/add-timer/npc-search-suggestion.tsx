import { useTranslation } from "react-i18next";
import type { SearchTimersNpcResponseDtoOutput } from "@lootlog/client/main";
import { getNpcTypeNames } from "@/constants/margonem";
import { formatLevelTag } from "@/features/timers/model/timer-labels";

type NpcSearchSuggestionProps = {
  npc: SearchTimersNpcResponseDtoOutput;
  isSelected: boolean;
};

export function NpcSearchSuggestion({
  npc,
  isSelected,
}: NpcSearchSuggestionProps) {
  const { t } = useTranslation("timers");

  const longname =
    getNpcTypeNames(npc.type)?.longname ?? t("addForm.mobFallback");

  const levelTag = npc.prof ? formatLevelTag(npc) : "";
  const npcDetails = levelTag ? ` ${levelTag}` : "";

  return (
    <div
      className={`ll:px-3 ll:py-2 ll:text-xs ll:border-b ll:border-gray-600/50 last:ll:border-b-0 ${
        isSelected ? "ll:bg-blue-500/30" : "ll:hover:bg-gray-700/50"
      }`}
    >
      <div className="ll:font-semibold ll:text-white">{npc.name}</div>
      <div className="ll:text-gray-400 ll:text-[10px]">
        {longname} • {npcDetails}
      </div>
    </div>
  );
}
