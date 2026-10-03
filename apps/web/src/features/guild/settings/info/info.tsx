import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { GuildDiscordSyncNotice } from "@/components/common/guild-discord-sync-notice";
import { useGuildDiscordSync } from "@/hooks/api/use-guild-discord-sync";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { format } from "date-fns";
import { History, Info, KeyRound, RefreshCcw, ShieldCheck } from "lucide-react";
import { InfoField } from "./info-field";
import { InfoSettingsSkeletonCards } from "./info-skeleton-cards";
import { useTranslation } from "react-i18next";
import type { DiscordGuildSyncStateResponseDto } from "@lootlog/client/main";

const getGuildSyncPresentation = (
  data: DiscordGuildSyncStateResponseDto | undefined,
  notAvailable: string,
  noErrors: string,
  syncError: string,
) => ({
  channelCount: data?.channelCount ?? 0,
  lastAttempt: data?.lastAttemptAt
    ? format(new Date(data.lastAttemptAt), "dd.MM.yyyy HH:mm:ss")
    : notAvailable,
  lastError: data?.lastError ? syncError : noErrors,
  lastSuccess: data?.lastSuccessAt
    ? format(new Date(data.lastSuccessAt), "dd.MM.yyyy HH:mm:ss")
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
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-3 px-3 pb-3">
          <h1 className="sr-only">{t("settings.guildInfo.title")}</h1>
          <GuildDiscordSyncNotice sync={sync} />

          {isLoading ? (
            <InfoSettingsSkeletonCards />
          ) : (
            <>
              <SectionCard>
                <SectionCardHeader
                  title={t("settings.guildInfo.syncStatus")}
                  icon={hasRequiredPermissions ? ShieldCheck : Info}
                  description={t("settings.guildInfo.syncStatusDescription")}
                  actions={
                    hasRequiredPermissions ? (
                      <Button
                        onClick={refresh}
                        disabled={!guildId || query.isFetching}
                        loading={isRefreshing}
                        icon={<RefreshCcw />}
                      >
                        {t("settings.guildInfo.refresh")}
                      </Button>
                    ) : undefined
                  }
                />
                <SectionCardContent>
                  <dl className="grid gap-3 lg:grid-cols-3">
                    <InfoField label={t("settings.guildInfo.fields.status")}>
                      <Badge variant="outline">
                        {t(`settings.guildInfo.statuses.${status}`)}
                      </Badge>
                    </InfoField>
                    <InfoField label={t("settings.guildInfo.fields.channels")}>
                      {data
                        ? t("settings.guildInfo.channelCounts", {
                            total: channelCount,
                            selectable: selectableChannelCount,
                          })
                        : t("settings.guildInfo.notAvailable")}
                    </InfoField>
                    <InfoField
                      label={t("settings.guildInfo.fields.permissions")}
                    >
                      <Badge
                        variant={hasRequiredPermissions ? "default" : "outline"}
                      >
                        {t(
                          `settings.guildInfo.permissions.${permissionStatus}`,
                        )}
                      </Badge>
                    </InfoField>
                  </dl>
                </SectionCardContent>
              </SectionCard>

              <SectionCard>
                <SectionCardHeader
                  title={t("settings.guildInfo.permissionSection.title")}
                  icon={KeyRound}
                  description={t(
                    "settings.guildInfo.permissionSection.description",
                  )}
                />
                <SectionCardContent className="flex flex-col gap-3">
                  <ul className="flex flex-wrap gap-2">
                    {requiredPermissions.map((permission) => (
                      <li key={permission}>
                        <Badge variant="outline">
                          {t(
                            `settings.guildInfo.discordPermissions.${permission}`,
                            { defaultValue: permission },
                          )}
                        </Badge>
                      </li>
                    ))}
                  </ul>

                  {hasRequiredPermissions ? (
                    <p className="text-sm text-muted-foreground">
                      {t("settings.guildInfo.reinstall.notNeeded")}
                    </p>
                  ) : null}
                </SectionCardContent>
              </SectionCard>

              <SectionCard>
                <SectionCardHeader
                  title={t("settings.guildInfo.activity.title")}
                  icon={History}
                />
                <SectionCardContent>
                  <dl className="grid gap-3 lg:grid-cols-3">
                    <InfoField
                      label={t("settings.guildInfo.fields.lastAttempt")}
                    >
                      {lastAttempt}
                    </InfoField>
                    <InfoField
                      label={t("settings.guildInfo.fields.lastSuccess")}
                    >
                      {lastSuccess}
                    </InfoField>
                    <InfoField label={t("settings.guildInfo.fields.lastError")}>
                      {data ? lastError : t("settings.guildInfo.notAvailable")}
                    </InfoField>
                  </dl>
                </SectionCardContent>
              </SectionCard>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
