import type { KillHistoryEntry } from "@lootlog/client/main";
import { differenceInSeconds } from "date-fns";
import { useTranslation } from "react-i18next";
import { formatDurationHuman } from "../../utils/format-duration";

type KillRespawnTimeProps = {
  kill: Pick<
    KillHistoryEntry,
    "isManualClose" | "killedAt" | "minSpawnTimeAtKill"
  >;
};

/** How long after the respawn window opened the hero fell, or that the window was closed by hand. */
export const KillRespawnTime = ({ kill }: KillRespawnTimeProps) => {
  const { t } = useTranslation();

  if (kill.isManualClose) {
    return (
      <span className="block text-right text-xs font-medium text-amber-400">
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
      {formatDurationHuman(respawnTimeSeconds)}
    </span>
  );
};
