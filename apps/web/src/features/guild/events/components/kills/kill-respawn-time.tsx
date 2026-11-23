import type { KillHistoryEntry } from "@lootlog/client/main";
import { differenceInSeconds } from "date-fns";
import { useTranslation } from "react-i18next";
import { formatDuration } from "@/utils/date/format-duration";

type KillRespawnTimeProps = {
  kill: Pick<
    KillHistoryEntry,
    "isManualClose" | "killedAt" | "minSpawnTimeAtKill"
  >;
};

export const KillRespawnTime = ({ kill }: KillRespawnTimeProps) => {
  const { t } = useTranslation();

  if (kill.isManualClose) {
    return (
      <span className="block text-right text-xs font-medium text-signal-timer">
        {t("events.kills.manualCloseLabel")}
      </span>
    );
  }

  const respawnTimeSeconds = differenceInSeconds(
    new Date(kill.killedAt),
    new Date(kill.minSpawnTimeAtKill),
  );

  return (
    <span className="block text-right font-medium tabular-nums">
      {formatDuration(respawnTimeSeconds, "human")}
    </span>
  );
};
