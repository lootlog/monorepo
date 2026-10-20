import { useTranslation } from "react-i18next";
import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { getFactionWarOutcome } from "./faction-war-standings";
import { formatFactionWarRemaining } from "./format-faction-war-remaining";

type FactionWarStatusProps = {
  status: "UPCOMING" | "RUNNING" | "ENDED";
  startsAt: string;
  endsAt: string;
  winners: readonly FactionWarFaction[];
};

/** Where the war stands: the time to its start or end, or how it ended. */
export const FactionWarStatus = ({
  status,
  startsAt,
  endsAt,
  winners,
}: FactionWarStatusProps) => {
  const { t } = useTranslation();
  const now = useMinuteTimestamp();

  if (status === "ENDED") {
    const outcome = getFactionWarOutcome(winners);

    return (
      <p className="text-sm font-medium text-white sm:text-base">
        {outcome.kind === "winner"
          ? t("factionWar.status.winner", {
              faction: t(`factionWar.factions.${outcome.faction}`),
            })
          : t(`factionWar.status.${outcome.kind}`)}
      </p>
    );
  }

  const remaining = formatFactionWarRemaining(
    now,
    Date.parse(status === "RUNNING" ? endsAt : startsAt),
  );

  return (
    <p className="text-sm font-medium text-white sm:text-base">
      {remaining
        ? t(`factionWar.status.${status}`, { remaining })
        : t(`factionWar.status.${status}Soon`)}
    </p>
  );
};
