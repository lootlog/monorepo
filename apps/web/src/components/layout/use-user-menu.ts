import { Palette, Server, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/config/routes";
import { useUser } from "@/hooks/api/user/use-user";
import { useLogout } from "@/hooks/auth/use-logout";
import { useGlobalContext } from "@/hooks/context/use-global-context";
import { useGateway } from "@/hooks/utils/use-gateway";
import type { LiveSignal } from "@/components/layout/user-signal-avatar";

export const SIGNAL_LABEL_COLOR: Record<LiveSignal, string> = {
  live: "text-sidebar-foreground/60",
  connecting: "text-sidebar-foreground/60",
  offline: "text-signal-timer",
};

export const SIGNAL_DOT_COLOR: Record<LiveSignal, string> = {
  live: "bg-signal-live",
  connecting: "bg-muted-foreground animate-pulse motion-reduce:animate-none",
  offline: "bg-signal-timer",
};

/**
 * What the account menu shows and does, shared by the desktop sidebar's
 * popover and the phone navigation sheet.
 */
export const useUserMenu = () => {
  const { t } = useTranslation();
  const { user, isPending } = useUser();
  const { logout, isPending: isLogoutPending } = useLogout();
  const { connected, joined } = useGateway();
  const { installAddonModal } = useGlobalContext();

  let signal: LiveSignal = "offline";

  if (joined) signal = "live";
  else if (connected) signal = "connecting";

  const settingsLinks = [
    {
      to: ROUTES.user.settings.account,
      label: t("settings.account.title"),
      icon: UserRound,
    },
    {
      to: ROUTES.user.settings.servers,
      label: t("settings.servers.navigation"),
      icon: Server,
    },
    {
      to: ROUTES.user.settings.appearance,
      label: t("settings.appearance.title"),
      icon: Palette,
    },
  ];

  return {
    user,
    isPending,
    signal,
    settingsLinks,
    logout,
    isLogoutPending,
    openInstallAddon: () => installAddonModal.dispatch({ type: "OPEN" }),
  };
};
