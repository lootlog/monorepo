import { getChatNpcCoordinatesLabel } from "./chat-message.helpers";
import type { ReactNode } from "react";
import { NpcTile } from "@/components/npc-tile";
import { useTranslation } from "react-i18next";

type Props = {
  npc?: {
    name: string;
    icon?: string;
    type?: string;
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

export const hasChatGatheringDetails = ({
  npc,
  description,
  minLvl,
  maxLvl,
}: Props) =>
  Boolean(npc || description || minLvl !== undefined || maxLvl !== undefined);

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
  if (!npc && !description && !level) return null;
  return (
    <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-0.5 ll:[overflow-wrap:anywhere]">
      {npc && (
        <div className="ll:flex ll:min-w-0 ll:items-center ll:gap-1.5">
          {npc?.icon && (
            <NpcTile
              npc={{ icon: npc.icon, nick: npc.name }}
              containerClassName="ll:w-6 ll:h-8 ll:shrink-0"
              className="ll:w-auto ll:max-w-6 ll:max-h-8 ll:rounded-none ll:object-contain"
            />
          )}
          <div className="ll:flex ll:min-h-8 ll:min-w-0 ll:flex-1 ll:flex-col ll:justify-center ll:gap-0.5">
            <div className="ll:text-[11px] ll:font-semibold ll:text-gray-100">
              {npc.name}
              {npc.lvl !== undefined && (
                <span className="ll:font-normal">{` (${npc.lvl}${npc.prof ?? ""})`}</span>
              )}
            </div>
            {location && (
              <div className="ll:text-[10px] ll:text-gray-400">{location}</div>
            )}
          </div>
          {action}
        </div>
      )}
      {(description || level) && (
        <div className="ll:flex ll:min-w-0 ll:items-center ll:gap-1.5">
          <div className="ll:flex ll:min-w-0 ll:flex-1 ll:flex-col ll:gap-0.5">
            {description && (
              <div className="ll:whitespace-pre-wrap ll:text-[11px] ll:text-gray-400">
                <span aria-hidden="true">„</span>
                <span>{description}</span>
                <span aria-hidden="true">”</span>
              </div>
            )}
            {level && (
              <div className="ll:text-[10px] ll:text-gray-300">{level}</div>
            )}
          </div>
          {!npc && action}
        </div>
      )}
    </div>
  );
}
