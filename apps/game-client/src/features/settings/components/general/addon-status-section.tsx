import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSocket } from "@/contexts/socket-context";
import type { LoginState } from "@/hooks/auth/login-state";
import { useLoginState } from "@/hooks/auth/use-login-state";
import type { RealtimeConnectionStatus } from "@/lib/realtime-connection-status";
import { useWindowsStore } from "@/store/windows.store";
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

const ACCOUNT_VALUE_KEY = {
  signedIn: "settings.general.accountSignedIn",
  checking: "settings.general.accountChecking",
  connecting: "settings.general.accountChecking",
  checkFailed: "settings.general.accountError",
  cookiesBlocked: "settings.general.accountCookiesBlocked",
  signedOut: "settings.general.accountSignedOut",
  awaitingPopup: "settings.general.accountSignedOut",
  popupBlocked: "settings.general.accountSignedOut",
  handoffExpired: "settings.general.accountSignedOut",
  handoffFailed: "settings.general.accountSignedOut",
} as const satisfies Record<LoginState, string>;

/**
 * Read-only health of the addon: who is signed in and whether the realtime
 * gateway delivers this player's Lootlogs. The account row never shows the
 * e-mail; signing in happens in the login window, which also explains a
 * failed check or blocked cookies.
 */
export const AddonStatusSection: FC = () => {
  const { t } = useTranslation();
  const { t: tCommon } = useTranslation("common");
  const { state, session } = useLoginState();
  const openAndFocus = useWindowsStore((windows) => windows.openAndFocus);
  const { joinedGuilds, status: connection } = useSocket();
  const signedIn = state === "signedIn";

  const connectionLabel = !signedIn
    ? tCommon("connection.signedOut")
    : connection === "online"
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

  const checking = state === "checking" || state === "connecting";
  const signedOut = !checking && !signedIn;

  const accountValue = t(ACCOUNT_VALUE_KEY[state], {
    name: session.data?.user.name,
  });

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
              onClick={() => openAndFocus("extension-login")}
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
              {tCommon("auth.check")}
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
                signedIn
                  ? CONNECTION_DOT_CLASS_NAME[connection]
                  : "ll:bg-gray-400",
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
