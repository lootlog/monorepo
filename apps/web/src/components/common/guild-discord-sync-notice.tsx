import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import type { useGuildDiscordSync } from "@/hooks/api/use-guild-discord-sync";
import { buildDiscordBotInstallUrl } from "@/utils/build-discord-bot-install-url";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Info, RefreshCcw, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

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

  let description = t("settings.guildInfo.syncUnknown.description");

  if (isMissing) {
    description = t("settings.notifications.permissionsBlocked.description");
  } else if (isLoading) {
    description = t("settings.guildInfo.syncUnknown.loading");
  } else if (hasError) {
    description = t("settings.guildInfo.syncUnknown.error");
  }

  return (
    <SectionCard role={hasError ? "alert" : "status"}>
      <SectionCardHeader
        title={t(
          isMissing
            ? "settings.notifications.permissionsBlocked.title"
            : "settings.guildInfo.syncUnknown.title",
        )}
        icon={isMissing ? ShieldAlert : Info}
        description={description}
      />
      <SectionCardContent className="flex flex-col gap-3">
        {isMissing && query.data?.missingPermissions.length ? (
          <div className="flex flex-wrap gap-2">
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
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={!guildId || isLoading}
            loading={isLoading}
            icon={<RefreshCcw className="size-3.5" />}
          >
            {t("settings.guildInfo.refresh")}
          </Button>
        </div>
      </SectionCardContent>
    </SectionCard>
  );
};
