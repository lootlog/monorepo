import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { GuildDiscordSyncNotice } from "@/components/common/guild-discord-sync-notice";
import { useGuildDiscordSync } from "@/hooks/api/use-guild-discord-sync";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { format } from "date-fns";
import { RefreshCcw, Info, ShieldCheck } from "lucide-react";
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
        <div className="px-3 pb-3 flex flex-col gap-4">
          <h1 className="sr-only">{t("settings.guildInfo.title")}</h1>
          <GuildDiscordSyncNotice sync={sync} />

          {isLoading ? (
            <>
              <SectionCard>
                <SectionCardContent className="flex flex-col gap-3">
                  <div className="grid gap-4 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-9 w-full" />
                      </div>
                    ))}
                  </div>
                </SectionCardContent>
              </SectionCard>
              <SectionCard>
                <SectionCardContent className="flex flex-col gap-3">
                  <Skeleton className="mb-3 h-5 w-32" />
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 rounded-md" />
                    ))}
                  </div>
                </SectionCardContent>
              </SectionCard>
              <SectionCard>
                <SectionCardContent className="flex flex-col gap-3">
                  <Skeleton className="mb-3 h-5 w-24" />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                  </div>
                </SectionCardContent>
              </SectionCard>
            </>
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
                        size="sm"
                        onClick={refresh}
                        disabled={!guildId || query.isFetching}
                        loading={isRefreshing}
                        icon={<RefreshCcw className="size-3.5" />}
                      >
                        {t("settings.guildInfo.refresh")}
                      </Button>
                    ) : undefined
                  }
                />
                <SectionCardContent className="flex flex-col gap-3">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="border-b border-border/70 py-3 last:border-b-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t("settings.guildInfo.fields.status")}
                      </p>
                      <div className="mt-2">
                        <Badge variant="outline">
                          {t(`settings.guildInfo.statuses.${status}`)}
                        </Badge>
                      </div>
                    </div>
                    <div className="border-b border-border/70 py-3 last:border-b-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t("settings.guildInfo.fields.channels")}
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {data
                          ? t("settings.guildInfo.channelCounts", {
                              total: channelCount,
                              selectable: selectableChannelCount,
                            })
                          : t("settings.guildInfo.notAvailable")}
                      </p>
                    </div>
                    <div className="border-b border-border/70 py-3 last:border-b-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t("settings.guildInfo.fields.permissions")}
                      </p>
                      <div className="mt-2">
                        <Badge
                          variant={
                            hasRequiredPermissions ? "default" : "outline"
                          }
                        >
                          {t(
                            `settings.guildInfo.permissions.${permissionStatus}`,
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </SectionCardContent>
              </SectionCard>

              <SectionCard>
                <SectionCardHeader
                  title={t("settings.guildInfo.permissionSection.title")}
                />
                <SectionCardContent className="flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground">
                    {t("settings.guildInfo.permissionSection.description")}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {requiredPermissions.map((permission) => (
                      <Badge key={permission} variant="outline">
                        {permission}
                      </Badge>
                    ))}
                  </div>

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
                />
                <SectionCardContent className="flex flex-col gap-3">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="border-b border-border/70 py-3 last:border-b-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t("settings.guildInfo.fields.lastAttempt")}
                      </p>
                      <p className="mt-2 text-sm font-medium">{lastAttempt}</p>
                    </div>
                    <div className="border-b border-border/70 py-3 last:border-b-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t("settings.guildInfo.fields.lastSuccess")}
                      </p>
                      <p className="mt-2 text-sm font-medium">{lastSuccess}</p>
                    </div>
                  </div>

                  <div className="border-b border-border/70 py-3 last:border-b-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t("settings.guildInfo.fields.lastError")}
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {data ? lastError : t("settings.guildInfo.notAvailable")}
                    </p>
                  </div>
                </SectionCardContent>
              </SectionCard>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
