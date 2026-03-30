import { useTranslation } from "react-i18next";
import {
  Info,
  Bot,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useBotStatus } from "@/hooks/api/notifications/use-bot-status";
import { DISCORD_BOT_PERMISSIONS, DISCORD_CLIENT_ID } from "@/config/discord";

const PermissionRow = ({
  label,
  granted,
  t,
}: {
  label: string;
  granted: boolean;
  t: (key: string) => string;
}) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm">{label}</span>
    <div className="flex items-center gap-1.5">
      {granted ? (
        <>
          <CheckCircle className="size-3.5 text-green-500" />
          <span className="text-xs text-green-500">
            {t("settings.notifications.info.granted")}
          </span>
        </>
      ) : (
        <>
          <XCircle className="size-3.5 text-destructive" />
          <span className="text-xs text-destructive">
            {t("settings.notifications.info.missing")}
          </span>
        </>
      )}
    </div>
  </div>
);

export const InfoSettings = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { data: botStatus, isPending } = useBotStatus(guildId);

  const handleReinstallBot = () => {
    if (!guildId) return;

    const searchParams = new URLSearchParams();
    searchParams.set("client_id", DISCORD_CLIENT_ID);
    searchParams.set("permissions", DISCORD_BOT_PERMISSIONS);
    searchParams.set("scope", "bot");
    searchParams.set("response_type", "code");
    searchParams.set("guild_id", guildId);
    searchParams.set("redirect_uri", `${window.location.origin}/init`);

    window.location.assign(
      `https://discord.com/api/oauth2/authorize?${searchParams.toString()}`,
    );
  };

  const hasMissingPermissions =
    botStatus &&
    botStatus.botPresent &&
    (!botStatus.permissions.sendMessages ||
      !botStatus.permissions.viewChannel ||
      !botStatus.permissions.embedLinks ||
      !botStatus.permissions.readMessageHistory);

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="px-3 py-3 flex flex-col gap-4">
        <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
              <Info className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">
                {t("settings.notifications.info.title")}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                {t("settings.notifications.info.description")}
              </p>
            </div>
          </div>
        </Card>

        {isPending && (
          <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">
              {t("settings.notifications.info.loading")}
            </p>
          </Card>
        )}

        {!isPending && !botStatus && (
          <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">
              {t("settings.notifications.info.unavailableStatus")}
            </p>
          </Card>
        )}

        {botStatus && (
          <>
            <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-500/10 p-2.5 shadow-inner shadow-blue-500/10">
                  <Bot className="size-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold leading-tight">
                    {t("settings.notifications.info.botStatus")}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {botStatus.guildName}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {botStatus.botPresent ? (
                    <>
                      <CheckCircle className="size-4 text-green-500" />
                      <span className="text-sm text-green-500">
                        {t("settings.notifications.info.botPresent")}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-destructive" />
                      <span className="text-sm text-destructive">
                        {t("settings.notifications.info.botMissing")}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-2 mt-1">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm">
                    {t("settings.notifications.info.channelMessages")}
                  </span>
                  <span
                    className={`text-xs ${botStatus.canSendChannelMessages ? "text-green-500" : "text-destructive"}`}
                  >
                    {botStatus.canSendChannelMessages
                      ? t("settings.notifications.info.capable")
                      : t("settings.notifications.info.unavailable")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm">
                    {t("settings.notifications.info.directMessages")}
                  </span>
                  <span
                    className={`text-xs ${botStatus.canSendDm ? "text-green-500" : "text-destructive"}`}
                  >
                    {botStatus.canSendDm
                      ? t("settings.notifications.info.capable")
                      : t("settings.notifications.info.unavailable")}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl p-2.5 shadow-inner ${
                    hasMissingPermissions
                      ? "bg-red-500/10 shadow-red-500/10"
                      : "bg-green-500/10 shadow-green-500/10"
                  }`}
                >
                  {hasMissingPermissions ? (
                    <ShieldAlert className="size-4 text-red-500" />
                  ) : (
                    <ShieldCheck className="size-4 text-green-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-tight">
                    {t("settings.notifications.info.permissions")}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {hasMissingPermissions
                      ? t("settings.notifications.info.missingPermissions")
                      : t(
                          "settings.notifications.info.allPermissionsGranted",
                        )}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-2 mt-1">
                <PermissionRow
                  label={t("settings.notifications.info.sendMessages")}
                  granted={botStatus.permissions.sendMessages}
                  t={t}
                />
                <PermissionRow
                  label={t("settings.notifications.info.viewChannel")}
                  granted={botStatus.permissions.viewChannel}
                  t={t}
                />
                <PermissionRow
                  label={t("settings.notifications.info.embedLinks")}
                  granted={botStatus.permissions.embedLinks}
                  t={t}
                />
                <PermissionRow
                  label={t("settings.notifications.info.readMessageHistory")}
                  granted={botStatus.permissions.readMessageHistory}
                  t={t}
                />
              </div>

              {(hasMissingPermissions || !botStatus.botPresent) && (
                <Button
                  onClick={handleReinstallBot}
                  className="w-full justify-center"
                >
                  <ExternalLink className="size-3.5" />
                  {t("settings.notifications.info.reinstallBot")}
                </Button>
              )}
            </Card>
          </>
        )}
      </div>
    </ScrollArea>
  );
};
