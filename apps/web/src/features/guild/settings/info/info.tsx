import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { PageHeader } from "@/components/common/page-header";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { hasConfirmedGuildDiscordPermissions } from "@/features/guild/settings/utils/has-confirmed-guild-discord-permissions";
import { buildDiscordBotInstallUrl } from "@/utils/build-discord-bot-install-url";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { format } from "date-fns";
import { Info, RefreshCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateGuildsControllerGetGuildDiscordSyncStatus,
  useGuildsControllerGetGuildDiscordSyncStatus,
  useGuildsControllerRefreshGuildDiscordSync,
} from "@lootlog/client/main";
import { invalidateNotificationsGuildControllerGetAvailableGuildTargets } from "@lootlog/client/main";

type GuildSyncPresentationData = {
  channelCount?: number;
  lastAttemptAt?: string | null;
  lastError?: string | null;
  lastSuccessAt?: string | null;
  missingPermissions?: string[];
  requiredPermissions?: string[];
  selectableChannelCount?: number;
  status?: string;
};

const getGuildSyncPresentation = (
  data: GuildSyncPresentationData | undefined,
  notAvailable: string,
  noErrors: string,
) => ({
  channelCount: data?.channelCount ?? 0,
  lastAttempt: data?.lastAttemptAt
    ? format(new Date(data.lastAttemptAt), "dd.MM.yyyy HH:mm:ss")
    : notAvailable,
  lastError: data?.lastError ?? noErrors,
  lastSuccess: data?.lastSuccessAt
    ? format(new Date(data.lastSuccessAt), "dd.MM.yyyy HH:mm:ss")
    : notAvailable,
  missingPermissions: data?.missingPermissions ?? [],
  requiredPermissions: data?.requiredPermissions ?? [],
  selectableChannelCount: data?.selectableChannelCount ?? 0,
  status: data?.status ?? "UNKNOWN",
});

export const InfoSettings = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGuildsControllerGetGuildDiscordSyncStatus({
    guildId: guildId ?? "",
  });
  const refreshMutation = useGuildsControllerRefreshGuildDiscordSync({
    mutation: {
      onSuccess: async (_, variables) => {
        const currentGuildId = variables?.pathParams.guildId;

        if (!currentGuildId) {
          return;
        }

        await Promise.all([
          invalidateGuildsControllerGetGuildDiscordSyncStatus(queryClient, {
            guildId: currentGuildId,
          }),
          invalidateNotificationsGuildControllerGetAvailableGuildTargets(
            queryClient,
            { guildId: currentGuildId },
          ),
        ]);
      },
    },
  });

  const installUrl = guildId ? buildDiscordBotInstallUrl(guildId) : "#";
  const hasRequiredPermissions = hasConfirmedGuildDiscordPermissions(data);
  const {
    channelCount,
    lastAttempt,
    lastError,
    lastSuccess,
    missingPermissions,
    requiredPermissions,
    selectableChannelCount,
    status,
  } = getGuildSyncPresentation(
    data,
    t("settings.guildInfo.notAvailable"),
    t("settings.guildInfo.noErrors"),
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <PageHeader
            title={t("settings.guildInfo.title")}
            icon={Info}
            description={t("settings.guildInfo.description")}
            actions={
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <Button
                  size="sm"
                  onClick={() =>
                    guildId &&
                    refreshMutation.mutate({ pathParams: { guildId } })
                  }
                  loading={refreshMutation.isPending}
                  icon={<RefreshCcw className="size-3.5" />}
                >
                  {t("settings.guildInfo.refresh")}
                </Button>
              </div>
            }
          />

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
                  icon={ShieldCheck}
                  description={t("settings.guildInfo.syncStatusDescription")}
                  actions={
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-xl p-2.5  ${
                          hasRequiredPermissions
                            ? "bg-green-500/10"
                            : "bg-amber-500/10"
                        }`}
                      >
                        {hasRequiredPermissions ? (
                          <ShieldCheck className="size-4 text-green-500" />
                        ) : (
                          <ShieldAlert className="size-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                  }
                />
                <SectionCardContent className="flex flex-col gap-3">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="border-b border-border/70 py-3 last:border-b-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t("settings.guildInfo.fields.status")}
                      </p>
                      <div className="mt-2">
                        <Badge variant="outline">{status}</Badge>
                      </div>
                    </div>
                    <div className="border-b border-border/70 py-3 last:border-b-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t("settings.guildInfo.fields.channels")}
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {t("settings.guildInfo.channelCounts", {
                          total: channelCount,
                          selectable: selectableChannelCount,
                        })}
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
                          {hasRequiredPermissions
                            ? t("settings.guildInfo.permissions.ok")
                            : t("settings.guildInfo.permissions.missing")}
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

                  {!hasRequiredPermissions ? (
                    <>
                      {missingPermissions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {missingPermissions.map((permission) => (
                            <Badge
                              key={permission}
                              variant="outline"
                              className="border-amber-500/40 text-amber-500"
                            >
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <p className="text-sm font-medium">
                          {t("settings.guildInfo.reinstall.title")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("settings.guildInfo.reinstall.description")}
                        </p>
                        <Button
                          size="sm"
                          className="mt-4"
                          onClick={() => window.location.assign(installUrl)}
                        >
                          {t("settings.guildInfo.reinstall.button")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("settings.guildInfo.reinstall.notNeeded")}
                    </p>
                  )}
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
                    <p className="mt-2 text-sm font-medium">{lastError}</p>
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
