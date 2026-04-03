import {
  useGuildDiscordSync,
  useRefreshGuildDiscordSync,
} from "@/hooks/api/guilds/use-guild-discord-sync";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { hasConfirmedGuildDiscordPermissions } from "@/features/guild-settings/utils/has-confirmed-guild-discord-permissions";
import { buildDiscordBotInstallUrl } from "@/utils/build-discord-bot-install-url";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import { format } from "date-fns";
import { Info, RefreshCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export const InfoSettings = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { data, isLoading } = useGuildDiscordSync();
  const refreshMutation = useRefreshGuildDiscordSync();

  const installUrl = guildId ? buildDiscordBotInstallUrl(guildId) : "#";
  const missingPermissions = data?.missingPermissions ?? [];
  const hasRequiredPermissions = hasConfirmedGuildDiscordPermissions(data);

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-xl bg-green-500/10 p-2.5 shadow-inner shadow-green-500/10">
                  <Info className="size-4 text-green-500" />
                </div>
                <div>
                  <h2 className="text-base font-semibold leading-tight">
                    {t("settings.guildInfo.title")}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("settings.guildInfo.description")}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
              >
                <RefreshCcw className="mr-2 size-3.5" />
                {refreshMutation.isPending
                  ? t("settings.guildInfo.refreshing")
                  : t("settings.guildInfo.refresh")}
              </Button>
            </div>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <>
              <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-xl p-2.5 shadow-inner ${
                      hasRequiredPermissions
                        ? "bg-green-500/10 shadow-green-500/10"
                        : "bg-amber-500/10 shadow-amber-500/10"
                    }`}
                  >
                    {hasRequiredPermissions ? (
                      <ShieldCheck className="size-4 text-green-500" />
                    ) : (
                      <ShieldAlert className="size-4 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">
                      {t("settings.guildInfo.syncStatus")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.guildInfo.syncStatusDescription")}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t("settings.guildInfo.fields.status")}
                    </p>
                    <div className="mt-2">
                      <Badge variant="outline">
                        {data?.status ?? "UNKNOWN"}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t("settings.guildInfo.fields.channels")}
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {t("settings.guildInfo.channelCounts", {
                        total: data?.channelCount ?? 0,
                        selectable: data?.selectableChannelCount ?? 0,
                      })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t("settings.guildInfo.fields.permissions")}
                    </p>
                    <div className="mt-2">
                      <Badge
                        variant={hasRequiredPermissions ? "default" : "outline"}
                      >
                        {hasRequiredPermissions
                          ? t("settings.guildInfo.permissions.ok")
                          : t("settings.guildInfo.permissions.missing")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
                <h3 className="text-base font-semibold">
                  {t("settings.guildInfo.permissionSection.title")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("settings.guildInfo.permissionSection.description")}
                </p>

                <div className="flex flex-wrap gap-2">
                  {(data?.requiredPermissions ?? []).map((permission) => (
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
              </Card>

              <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
                <h3 className="text-base font-semibold">
                  {t("settings.guildInfo.activity.title")}
                </h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t("settings.guildInfo.fields.lastAttempt")}
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {data?.lastAttemptAt
                        ? format(
                            new Date(data.lastAttemptAt),
                            "dd.MM.yyyy HH:mm:ss",
                          )
                        : t("settings.guildInfo.notAvailable")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t("settings.guildInfo.fields.lastSuccess")}
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {data?.lastSuccessAt
                        ? format(
                            new Date(data.lastSuccessAt),
                            "dd.MM.yyyy HH:mm:ss",
                          )
                        : t("settings.guildInfo.notAvailable")}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/30 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {t("settings.guildInfo.fields.lastError")}
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {data?.lastError ?? t("settings.guildInfo.noErrors")}
                  </p>
                </div>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
