import type { GuildGroupFightRankingResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";

type Summary = GuildGroupFightRankingResponseDtoOutput["summary"];

const SUMMARY_KEYS = [
  "totalFights",
  "wins",
  "losses",
  "draws",
  "fullTeamFights",
  "totalDurationSeconds",
] as const;

const SUMMARY_LABEL_KEYS: Record<(typeof SUMMARY_KEYS)[number], string> = {
  totalFights: "groupFights.fights",
  wins: "groupFights.wins",
  losses: "groupFights.losses",
  draws: "groupFights.draws",
  fullTeamFights: "groupFights.fullTeamFights",
  totalDurationSeconds: "groupFights.duration",
};

export function GroupFightSummary({ summary }: { summary: Summary }) {
  const { t } = useTranslation();

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {SUMMARY_KEYS.map((key) => (
        <div key={key} className="rounded-lg border p-3">
          <dt className="text-sm text-muted-foreground">
            {t(SUMMARY_LABEL_KEYS[key])}
          </dt>
          <dd className="text-xl font-semibold">
            {key === "totalDurationSeconds"
              ? t("groupFights.seconds", { count: summary[key] })
              : summary[key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
