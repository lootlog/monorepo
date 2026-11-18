import { RefreshCooldown } from "@/components/common/refresh-cooldown";
import type { useGuildDiscordSync } from "@/hooks/api/use-guild-discord-sync";
import { buildDiscordBotInstallUrl } from "@/utils/build-discord-bot-install-url";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lootlog/ui/components/alert";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { CircleAlert, Info, RefreshCw, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

const getNoticePresentation = (state: {
  isMissing: boolean;
  isLoading: boolean;
  hasError: boolean;
}) => {
  if (state.isMissing) {
    return {
      variant: "alert",
      Icon: ShieldAlert,
      descriptionKey: "settings.notifications.permissionsBlocked.description",
    } as const;
  }

  if (state.isLoading) {
    return {
      variant: "default",
      Icon: Info,
      descriptionKey: "settings.guildInfo.syncUnknown.loading",
    } as const;
  }

  if (state.hasError) {
    return {
      variant: "destructive",
      Icon: CircleAlert,
      descriptionKey: "settings.guildInfo.syncUnknown.error",
    } as const;
  }

  return {
    variant: "default",
    Icon: Info,
    descriptionKey: "settings.guildInfo.syncUnknown.description",
  } as const;
};

type GuildDiscordSyncNoticeProps = {
  sync: ReturnType<typeof useGuildDiscordSync>;
};

export const GuildDiscordSyncNotice = ({
  sync,
}: GuildDiscordSyncNoticeProps) => {
  const { t } = useTranslation();

  const {
    guildId,
    query,
    isRefreshing,
    isRefreshError,
    refreshCooldown,
    permissionStatus,
    refresh,
  } = sync;

  if (permissionStatus === "ok") return null;

  const isMissing = permissionStatus === "missing";
  const isLoading = query.isFetching || isRefreshing;

  const hasError =
    query.isError ||
    isRefreshError ||
    query.data?.status === "FAILED" ||
    Boolean(query.data?.lastError);

  const { variant, Icon, descriptionKey } = getNoticePresentation({
    isMissing,
    isLoading,
    hasError,
  });

  return (
    // Only the description is live: the cooldown countdown below it must not
    // be re-announced on every tick.
    <Alert variant={variant} role={undefined}>
      <Icon />
      <AlertTitle>
        {t(
          isMissing
            ? "settings.notifications.permissionsBlocked.title"
            : "settings.guildInfo.syncUnknown.title",
        )}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2.5">
        <p role={hasError ? "alert" : "status"}>{t(descriptionKey)}</p>
        {isMissing && query.data?.missingPermissions.length ? (
          <div className="flex flex-wrap gap-1.5">
            {query.data.missingPermissions.map((permission) => (
              <Badge key={permission} variant="secondary">
                {permission}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {isMissing && guildId ? (
            <Button
              size="sm"
              onClick={() =>
                window.location.assign(buildDiscordBotInstallUrl(guildId))
              }
            >
              {t("settings.notifications.permissionsBlocked.reinstall")}
            </Button>
          ) : null}
          {refreshCooldown.isExpired ? (
            <Button
              size="sm"
              variant="outline"
              onClick={refresh}
              disabled={!guildId || isLoading}
              loading={isLoading}
              icon={<RefreshCw />}
            >
              {t("settings.guildInfo.refresh")}
            </Button>
          ) : (
            <RefreshCooldown time={refreshCooldown.label} />
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
