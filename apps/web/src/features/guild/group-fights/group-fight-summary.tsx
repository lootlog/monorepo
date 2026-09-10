import type { GuildGroupFightRankingResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Flag,
  Skull,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { formatDurationHuman } from "../events/utils/format-duration";

type Summary = GuildGroupFightRankingResponseDtoOutput["summary"];

const SUMMARY_TILES: ReadonlyArray<{
  key: keyof Summary;
  labelKey: string;
  icon: LucideIcon;
  accent: string;
}> = [
  {
    key: "totalFights",
    labelKey: "groupFights.fights",
    icon: Swords,
    accent: "text-foreground",
  },
  {
    key: "wins",
    labelKey: "groupFights.wins",
    icon: Trophy,
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "losses",
    labelKey: "groupFights.losses",
    icon: Skull,
    accent: "text-red-600 dark:text-red-400",
  },
  {
    key: "flees",
    labelKey: "groupFights.flees",
    icon: Flag,
    accent: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "fullTeamFights",
    labelKey: "groupFights.fullTeamFights",
    icon: Users,
    accent: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "totalDurationSeconds",
    labelKey: "groupFights.totalTime",
    icon: Clock,
    accent: "text-foreground",
  },
];

export function GroupFightSummary({ summary }: { summary: Summary }) {
  const { t } = useTranslation();

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {SUMMARY_TILES.map(({ key, labelKey, icon: Icon, accent }) => (
        <div
          key={key}
          className="flex items-center gap-4 rounded-lg border bg-card p-4"
        >
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted",
              accent,
            )}
          >
            <Icon className="size-7" aria-hidden />
          </span>
          <div className="min-w-0">
            <dt className="truncate text-sm text-muted-foreground">
              {t(labelKey)}
            </dt>
            <dd className={cn("text-2xl font-semibold tabular-nums", accent)}>
              {key === "totalDurationSeconds"
                ? formatDurationHuman(summary[key])
                : summary[key]}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
