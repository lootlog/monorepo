import { BandSection } from "@/components/common/band-section";
import { DetailField } from "@/components/common/detail-field";
import { GuildDiscordSyncNotice } from "@/components/common/guild-discord-sync-notice";
import { useGuildDiscordSync } from "@/hooks/api/use-guild-discord-sync";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DiscordGuildSyncStateResponseDto } from "@lootlog/client/main";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";
import { SettingsTabPage } from "@/components/common/settings-tab-page";
import { InfoSettingsSkeletonSections } from "./info-skeleton-sections";

const getGuildSyncPresentation = (
  data: DiscordGuildSyncStateResponseDto | undefined,
  notAvailable: string,
  noErrors: string,
  syncError: string,
) => ({
  channelCount: data?.channelCount ?? 0,
  lastAttempt: data?.lastAttemptAt
    ? timestampToDate(data.lastAttemptAt, DATE_TIME_WITH_SECONDS_FORMAT)
    : notAvailable,
  lastError: data?.lastError ? syncError : noErrors,
  lastSuccess: data?.lastSuccessAt
    ? timestampToDate(data.lastSuccessAt, DATE_TIME_WITH_SECONDS_FORMAT)
    : notAvailable,
  requiredPermissions: data?.requiredPermissions ?? [],
  selectableChannelCount: data?.selectableChannelCount ?? 0,
});

export const InfoSettings = () => {
  const { t } = useTranslation();
  const sync = useGuildDiscordSync();

  const {
    guildId,
    query,
    isRefreshing,
    isRefreshError,
    permissionStatus,
    refresh,
  } = sync;

  const { data, isLoading } = query;
  const hasRequiredPermissions = permissionStatus === "ok";
  let status = data?.status ?? "UNKNOWN";

  if (query.isError || isRefreshError) status = "FAILED";

  if (isRefreshing) status = "SYNCING";

  const {
    channelCount,
    lastAttempt,
    lastError,
    lastSuccess,
    requiredPermissions,
    selectableChannelCount,
  } = getGuildSyncPresentation(
    data,
    t("settings.guildInfo.notAvailable"),
    t("settings.guildInfo.noErrors"),
    t("settings.guildInfo.syncUnknown.error"),
  );

  return (
    <SettingsTabPage title={t("settings.guildInfo.title")}>
      {!hasRequiredPermissions && (
        <div className="p-3">
          <GuildDiscordSyncNotice sync={sync} />
        </div>
      )}
      {isLoading ? (
        <InfoSettingsSkeletonSections />
      ) : (
        <>
          <BandSection
            id="guild-info-sync"
            title={t("settings.guildInfo.syncStatus")}
            description={t("settings.guildInfo.syncStatusDescription")}
            trailing={
              hasRequiredPermissions ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refresh}
                  disabled={!guildId || query.isFetching}
                  loading={isRefreshing}
                  icon={<RefreshCw />}
                >
                  {t("settings.guildInfo.refresh")}
                </Button>
              ) : undefined
            }
          >
            <dl className="divide-y divide-border/60">
              <DetailField label={t("settings.guildInfo.fields.status")}>
                <Badge variant="outline">
                  {t(`settings.guildInfo.statuses.${status}`)}
                </Badge>
              </DetailField>
              <DetailField label={t("settings.guildInfo.fields.channels")}>
                {data
                  ? t("settings.guildInfo.channelCounts", {
                      total: channelCount,
                      selectable: selectableChannelCount,
                    })
                  : t("settings.guildInfo.notAvailable")}
              </DetailField>
              <DetailField label={t("settings.guildInfo.fields.permissions")}>
                <Badge variant={hasRequiredPermissions ? "default" : "outline"}>
                  {t(`settings.guildInfo.permissions.${permissionStatus}`)}
                </Badge>
              </DetailField>
            </dl>
          </BandSection>

          <BandSection
            id="guild-info-permissions"
            title={t("settings.guildInfo.permissionSection.title")}
            description={t("settings.guildInfo.permissionSection.description")}
          >
            <ul className="flex flex-wrap gap-2">
              {requiredPermissions.map((permission) => (
                <li key={permission} className="flex">
                  <Badge variant="outline">
                    {t(`settings.guildInfo.discordPermissions.${permission}`, {
                      defaultValue: permission,
                    })}
                  </Badge>
                </li>
              ))}
            </ul>
            {hasRequiredPermissions && (
              <p className="text-sm text-muted-foreground">
                {t("settings.guildInfo.reinstall.notNeeded")}
              </p>
            )}
          </BandSection>

          <BandSection
            id="guild-info-activity"
            title={t("settings.guildInfo.activity.title")}
          >
            <dl className="divide-y divide-border/60">
              <DetailField label={t("settings.guildInfo.fields.lastAttempt")}>
                {lastAttempt}
              </DetailField>
              <DetailField label={t("settings.guildInfo.fields.lastSuccess")}>
                {lastSuccess}
              </DetailField>
              <DetailField label={t("settings.guildInfo.fields.lastError")}>
                {data ? lastError : t("settings.guildInfo.notAvailable")}
              </DetailField>
            </dl>
          </BandSection>
        </>
      )}
    </SettingsTabPage>
  );
};
