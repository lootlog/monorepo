import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LOOTLOG_APP_URL } from "@/config/app";
import { useSocket } from "@/contexts/socket-context";
import { useSession } from "@/hooks/auth/use-session";
import type { RealtimeConnectionStatus } from "@/lib/realtime-connection-status";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const STATUS_VALUE_CLASS_NAME =
  "ll:min-w-0 ll:flex-1 ll:select-text ll:truncate ll:text-right ll:text-xs ll:text-muted-foreground";

const CONNECTION_DOT_CLASS_NAME = {
  online: "ll:bg-green-400",
  connecting: "ll:bg-yellow-400",
  reconnecting: "ll:bg-red-400",
  unreachable: "ll:bg-red-400",
} satisfies Record<RealtimeConnectionStatus, string>;

/**
 * Read-only health of the addon: who is signed in and whether the realtime
 * gateway delivers this player's Lootlogs. The account row never shows the
 * e-mail; the sign-out hint covers both a missing login and blocked
 * third-party cookies, since the client cannot tell them apart.
 */
export const AddonStatusSection: FC = () => {
  const { t } = useTranslation();
  const { t: tCommon } = useTranslation("common");
  const session = useSession();
  const { joinedGuilds, status: connection } = useSocket();

  const connectionLabel =
    connection === "online"
      ? t("settings.general.connectionConnected", {
          count: joinedGuilds.length,
        })
      : tCommon(`connection.${connection}`);

  const {
    guildsQuery: { data: guilds },
  } = useLootlogGuilds();

  const joinedGuildNames = joinedGuilds.map(
    (guildId) => guilds?.find((guild) => guild.id === guildId)?.name ?? guildId,
  );

  const checking = session.isPending || session.isRefetching;
  const signedOut = !checking && !session.data;

  const accountValue = checking
    ? t("settings.general.accountChecking")
    : session.data
      ? t("settings.general.accountSignedIn", {
          name: session.data.user.name,
        })
      : session.error
        ? t("settings.general.accountError")
        : t("settings.general.accountSignedOut");

  return (
    <SettingsSection title={t("settings.general.statusTitle")}>
      <SettingsRow
        controlId="account-status"
        label={t("settings.general.accountLabel")}
        description={
          signedOut ? t("settings.general.accountSignedOutHint") : undefined
        }
        layout={signedOut ? "stacked" : "inline"}
        control="wide"
        controlClassName="ll:gap-2"
      >
        <span
          className={cn(
            STATUS_VALUE_CLASS_NAME,
            signedOut && "ll:text-destructive-foreground ll:text-left",
          )}
          title={accountValue}
        >
          {accountValue}
        </span>
        {signedOut ? (
          <>
            <Button
              size="xs"
              variant="outline"
              render=<a
                href={LOOTLOG_APP_URL}
                target="_blank"
                rel="noreferrer noopener"
              />
            >
              {tCommon("auth.signIn")}
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => {
                void session.refetch();
              }}
            >
              {tCommon("auth.extensionCheck")}
            </Button>
          </>
        ) : null}
      </SettingsRow>
      <SettingsRow
        controlId="connection-status"
        label={t("settings.general.connectionLabel")}
        control="wide"
        controlClassName="ll:justify-end"
      >
        <Tooltip>
          <TooltipTrigger className="ll:inline-flex ll:min-w-0 ll:max-w-full ll:items-center ll:gap-1.5 ll:border-0 ll:bg-transparent ll:p-0 ll:text-xs ll:text-muted-foreground ll-custom-cursor-pointer">
            <span
              aria-hidden
              className={cn(
                "ll:size-2 ll:shrink-0 ll:rounded-full",
                CONNECTION_DOT_CLASS_NAME[connection],
              )}
            />
            <span className="ll:truncate">{connectionLabel}</span>
          </TooltipTrigger>
          <TooltipContent>
            {joinedGuildNames.length > 0 ? (
              <div className="ll:flex ll:flex-col ll:gap-0.5">
                {joinedGuildNames.map((name) => (
                  <div key={name}>{name}</div>
                ))}
              </div>
            ) : (
              connectionLabel
            )}
          </TooltipContent>
        </Tooltip>
      </SettingsRow>
    </SettingsSection>
  );
};
