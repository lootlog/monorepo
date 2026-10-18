import { MetaItem } from "@/components/common/meta-item";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  Award,
  Calendar,
  CircleDashed,
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
import { upperFirst } from "es-toolkit";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";

export type BattleMetadataProps = {
  battle: Battle;
};

type BattleMetadataItem = {
  key: string;
  icon: FC<{ className?: string }>;
  label: ReactNode;
  tooltip: string;
  className?: string;
};

/** The battle's details as `MetaItem`s for the page's `DetailBar`. */
export const BattleMetadata: FC<BattleMetadataProps> = ({ battle }) => {
  const { t } = useTranslation();

  const warrior = battle.warriors.find(
    (w) => w.originalId === battle.characterId,
  );

  const items: BattleMetadataItem[] = [
    {
      key: "startTime",
      icon: Calendar,
      label: timestampToDate(battle.createdAt),
      tooltip: t("battleUi.metadata.startTime"),
    },
    {
      key: "duration",
      icon: Clock,
      label: formatSeconds(battle.duration),
      tooltip: t("battleUi.metadata.duration"),
    },
    {
      key: "type",
      icon: Users,
      label: battle.type,
      tooltip: t("battleUi.metadata.battleType"),
    },
    {
      key: "world",
      icon: Earth,
      label: upperFirst(battle.world),
      tooltip: t("battleUi.metadata.world"),
    },
    {
      key: "visibility",
      icon: battle.public ? Unlock : Lock,
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
      icon: Award,
      label: t("battleUi.metadata.honorPointsLabel", { value: warrior.ph }),
      tooltip: t("battleUi.metadata.honorPointsTooltip"),
    });
  }

  if (battle.unfinished) {
    items.push({
      key: "unfinished",
      icon: CircleDashed,
      label: t("battleUi.metadata.unfinished"),
      tooltip: t("battleUi.metadata.unfinishedTooltip"),
    });
  }

  if (battle.hasFlee) {
    items.push({
      key: "flee",
      icon: EmergencyExitIcon,
      label: t("battleUi.metadata.flee"),
      tooltip: t("battleUi.metadata.fleeTooltip"),
    });
  }

  if (battle.matchmaking) {
    items.push({
      key: "matchmaking",
      icon: Swords,
      label: t("battleUi.metadata.matchmaking"),
      tooltip: t("battleUi.metadata.matchmakingTooltip"),
      className: BATTLE_TEXT_COLORS.metric.secondary,
    });
  }

  return items.map((item) => (
    <Tooltip key={item.key}>
      <TooltipTrigger
        render={<span className="flex cursor-help" tabIndex={0} />}
      >
        <MetaItem
          icon={item.icon}
          label={item.tooltip}
          className={item.className}
        >
          {item.label}
        </MetaItem>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        <p>{item.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  ));
};
