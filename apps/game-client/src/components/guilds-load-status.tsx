import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";

/**
 * Loading or failure of the Lootlogs and the preferences that hide some of
 * them, shown in place of a Lootlog picker until both have loaded.
 */
export const GuildsLoadStatus: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation("common");

  const { areVisibleGuildsResolved, guildsQuery, preferencesQuery } =
    useLootlogGuilds();

  if (areVisibleGuildsResolved) return null;

  const failed =
    (!guildsQuery.data && guildsQuery.error) ||
    (!preferencesQuery.data && preferencesQuery.error);

  return failed ? (
    <AsyncStatusIndicator
      active
      kind="error"
      label={t("async.guildsError")}
      onRetry={() => {
        void Promise.all([guildsQuery.refetch(), preferencesQuery.refetch()]);
      }}
      retryLabel={t("actions.retry")}
      className={className}
    />
  ) : (
    <AsyncStatusIndicator
      active
      delay
      kind="loading"
      label={t("async.loadingGuilds")}
      className={className}
    />
  );
};
