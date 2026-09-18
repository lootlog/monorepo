import { KpiCard } from "@/components/common/kpi-card";
import type {
  GuildKillStatsResponseDtoOutputOverview,
  NpcType,
} from "@lootlog/client/main";
import {
  Flame,
  Mountain,
  Shield,
  Swords,
  Sword,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { TRACKABLE_NPC_TYPES } from "../constants";

const NPC_TYPE_ICONS: Partial<Record<NpcType, LucideIcon>> = {
  TITAN: Mountain,
  COLOSSUS: Flame,
  HERO: Shield,
  ELITE2: Sword,
};

const numberFormatter = new Intl.NumberFormat("pl-PL");

type KillStatsOverviewProps = {
  data?: GuildKillStatsResponseDtoOutputOverview;
  isLoading?: boolean;
};

export const KillStatsOverview = ({
  data,
  isLoading = false,
}: KillStatsOverviewProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <KpiCard
        icon={Swords}
        label={t("kills.overview.totalKills")}
        value={numberFormatter.format(data?.guildUniqueKills ?? 0)}
        detail={t("kills.overview.participations", {
          value: numberFormatter.format(data?.totalMemberParticipations ?? 0),
        })}
        isLoading={isLoading}
        // Five tiles in two columns would leave the last one orphaned.
        className="col-span-2 lg:col-span-1"
      />
      {TRACKABLE_NPC_TYPES.map((type) => (
        <KpiCard
          key={type}
          icon={NPC_TYPE_ICONS[type] ?? Sword}
          label={t(`npcType.${type}`)}
          value={numberFormatter.format(data?.killsByType[type] ?? 0)}
          detail={t("kills.overview.participations", {
            value: numberFormatter.format(
              data?.participationsByType[type] ?? 0,
            ),
          })}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};
