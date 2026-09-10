import { getChatNpcCoordinatesLabel } from "./chat-message.helpers";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  npc?: {
    name: string;
    lvl?: number;
    prof?: string;
    location?: string;
    x?: number;
    y?: number;
  };
  action?: ReactNode;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
};

export function ChatGatheringDetails({
  npc,
  action,
  description,
  minLvl,
  maxLvl,
}: Props) {
  const { t } = useTranslation("chat");

  const level =
    minLvl !== undefined || maxLvl !== undefined
      ? t("gatherings.level", { min: minLvl ?? 0, max: maxLvl ?? "∞" })
      : null;

  const location = npc
    ? [npc.location, getChatNpcCoordinatesLabel(npc)].filter(Boolean).join(" ")
    : "";

  return (
    <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-[2px] ll:[overflow-wrap:anywhere]">
      {npc && (
        <div className="ll:flex ll:min-h-[32px] ll:min-w-0 ll:items-center ll:gap-[6px]">
          <div className="ll:flex ll:min-h-[32px] ll:min-w-0 ll:flex-1 ll:flex-col ll:justify-center ll:gap-0">
            <div
              className="ll:truncate ll:text-[10px] ll:font-semibold ll:text-inherit"
              title={npc.name}
            >
              {npc.name}
              {npc.lvl !== undefined && (
                <span className="ll:font-normal">{` (${npc.lvl}${npc.prof ?? ""})`}</span>
              )}
            </div>
            {location && (
              <div className="ll:text-[10px] ll:text-muted-foreground">
                {location}
              </div>
            )}
          </div>
          {action}
        </div>
      )}
      {(!npc || description || level) && (
        <div className="ll:flex ll:min-h-[32px] ll:min-w-0 ll:items-center ll:gap-[6px]">
          <div className="ll:flex ll:min-w-0 ll:flex-1 ll:flex-col ll:gap-[2px]">
            <div className="ll:whitespace-pre-wrap ll:text-[11px] ll:text-white">
              {description || (!npc && t("gatherings.noDescription"))}
            </div>
            {level && (
              <div className="ll:text-[10px] ll:text-white">{level}</div>
            )}
          </div>
          {!npc && action}
        </div>
      )}
    </div>
  );
}
