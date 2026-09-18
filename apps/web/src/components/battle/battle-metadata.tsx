import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { format } from "date-fns";
import {
  Award,
  Calendar,
  Clock,
  Earth,
  Lock,
  Swords,
  Unlock,
  Users,
} from "lucide-react";
import { EmergencyExitIcon } from "@lootlog/ui/components/emergency-exit-icon";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatSeconds } from "@/utils/date/format-seconds";
import type { Battle } from "@/lib/api/battlelog-types";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { cn } from "cn";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";

export type BattleMetadataProps = {
  battle: Battle;
  className?: string;
};

type BattleMetadataItem = {
  key: string;
  icon: ReactNode;
  label: ReactNode;
  tooltip: string;
  className?: string;
};

export const BattleMetadata: FC<BattleMetadataProps> = ({
  battle,
  className,
}) => {
  const { t } = useTranslation();

  const warrior = battle.warriors.find(
    (w) => w.originalId === battle.characterId,
  );

  const items: BattleMetadataItem[] = [
    {
      key: "startTime",
      icon: <Calendar size={14} />,
      label: format(battle.createdAt, "dd.MM.yyyy HH:mm"),
      tooltip: t("battleUi.metadata.startTime"),
    },
    {
      key: "duration",
      icon: <Clock size={14} />,
      label: formatSeconds(battle.duration),
      tooltip: t("battleUi.metadata.duration"),
    },
    {
      key: "type",
      icon: <Users size={14} />,
      label: battle.type,
      tooltip: t("battleUi.metadata.battleType"),
    },
    {
      key: "world",
      icon: <Earth size={14} />,
      label: capitalizeFirstLetter(battle.world),
      tooltip: t("battleUi.metadata.world"),
    },
    {
      key: "visibility",
      icon: battle.public ? <Unlock size={14} /> : <Lock size={14} />,
      label: battle.public
        ? t("battleUi.metadata.public")
        : t("battleUi.metadata.private"),
      tooltip: battle.public
        ? t("battleUi.metadata.publicTooltip")
        : t("battleUi.metadata.privateTooltip"),
    },
  ];

  if (warrior?.ph !== 0 && warrior?.ph !== undefined) {
    items.push({
      key: "honorPoints",
      icon: <Award size={14} />,
      label: t("battleUi.metadata.honorPointsLabel", { value: warrior.ph }),
      tooltip: t("battleUi.metadata.honorPointsTooltip"),
    });
  }

  if (battle.hasFlee) {
    items.push({
      key: "flee",
      icon: <EmergencyExitIcon size={14} />,
      label: t("battleUi.metadata.flee"),
      tooltip: t("battleUi.metadata.fleeTooltip"),
    });
  }

  if (battle.matchmaking) {
    items.push({
      key: "matchmaking",
      icon: <Swords size={14} />,
      label: t("battleUi.metadata.matchmaking"),
      tooltip: t("battleUi.metadata.matchmakingTooltip"),
      className: BATTLE_TEXT_COLORS.metric.secondary,
    });
  }

  return (
    <TooltipProvider>
      <ul
        className={cn(
          "flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground",
          className,
        )}
      >
        {items.map((item) => (
          <li key={item.key} className="flex">
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className={cn(
                      "flex cursor-help items-center gap-1.5 whitespace-nowrap tabular-nums",
                      item.className,
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </span>
                }
              />
              <TooltipContent side="top" sideOffset={8}>
                <p>{item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </TooltipProvider>
  );
};
