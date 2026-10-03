import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { ChevronUp, LogOut, Palette, Server, UserRound } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useSidebar } from "@lootlog/ui/components/sidebar";
import { cn } from "cn";
import { useUser } from "@/hooks/api/user/use-user";
import { useLogout } from "@/hooks/auth/use-logout";
import { Link } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { useTranslation } from "react-i18next";
import { useGateway } from "@/hooks/utils/use-gateway";
import {
  type LiveSignal,
  UserSignalAvatar,
} from "@/components/layout/user-signal-avatar";

const SIGNAL_LABEL_COLOR: Record<LiveSignal, string> = {
  live: "text-sidebar-foreground/60",
  connecting: "text-sidebar-foreground/60",
  offline: "text-amber-300",
};

const SIGNAL_DOT_COLOR: Record<LiveSignal, string> = {
  live: "bg-emerald-400",
  connecting: "bg-muted-foreground animate-pulse motion-reduce:animate-none",
  offline: "bg-amber-400",
};

/** The avatar column continues the server rail above it. */
const BAR_GRID =
  "grid h-14 w-full grid-cols-[4rem_minmax(0,1fr)_2.75rem] items-center";

const AVATAR_CELL =
  "flex h-full items-center justify-center border-r border-solid";

export const UserMenu = () => {
  const { user, isPending } = useUser();
  const { t } = useTranslation();
  const { logout, isPending: isLogoutPending } = useLogout();
  const { connected, joined } = useGateway();
  const { setOpenMobile } = useSidebar();

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

  // The bar needs only the session, so it does not wait for preferences.
  if (!user) {
    return (
      <div className={cn(BAR_GRID, "bg-sidebar")}>
        {isPending && (
          <>
            <div className={AVATAR_CELL}>
              <Skeleton className="size-8 rounded-full" />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 pl-3">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              BAR_GRID,
              "group cursor-pointer bg-sidebar text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-popup-open:bg-sidebar-accent/45",
            )}
          >
            <span className={AVATAR_CELL}>
              <UserSignalAvatar image={user.image} signal={signal} />
            </span>
            <span className="flex min-w-0 flex-col gap-1.5 pl-3">
              <span className="truncate text-sm font-semibold leading-none">
                {user.name}
              </span>
              <span
                role="status"
                className={cn(
                  "truncate text-xs leading-none transition-colors",
                  SIGNAL_LABEL_COLOR[signal],
                )}
              >
                {t(`layout.userMenu.${signal}`)}
              </span>
            </span>
            <ChevronUp
              aria-hidden="true"
              className="size-4 justify-self-center text-sidebar-foreground/50 transition-[color,rotate] duration-200 group-hover:text-sidebar-foreground group-data-popup-open:rotate-180 motion-reduce:transition-none"
            />
          </button>
        }
      />
      <DropdownMenuContent
        align="start"
        alignOffset={8}
        side="top"
        sideOffset={8}
        className="w-[calc(var(--anchor-width)-1rem)] min-w-64 overflow-hidden rounded-xl p-0"
      >
        <div className="flex flex-col gap-3 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <UserSignalAvatar
              image={user.image}
              signal={signal}
              className="size-12 [--signal-surface:var(--popover)]"
            />
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="truncate text-base font-semibold leading-none">
                {user.name}
              </span>
              {user.email && (
                <span className="truncate text-xs leading-none text-muted-foreground">
                  {user.email}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
            <span
              aria-hidden="true"
              className={cn(
                "mt-1 size-1.5 shrink-0 rounded-full",
                SIGNAL_DOT_COLOR[signal],
              )}
            />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-semibold leading-none">
                {t(`layout.userMenu.${signal}`)}
              </span>
              <span className="text-xs leading-snug text-muted-foreground">
                {t(`layout.userMenu.${signal}Description`)}
              </span>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="flex flex-col gap-0.5 p-1.5">
          {settingsLinks.map(({ to, label, icon: Icon }) => (
            <DropdownMenuItem
              key={to}
              render={<Link to={to} onClick={() => setOpenMobile(false)} />}
              className="rounded-lg px-2.5 py-2"
            >
              <Icon />
              {label}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-1.5">
          <DropdownMenuItem
            variant="destructive"
            closeOnClick={false}
            disabled={isLogoutPending}
            onClick={logout}
            className="rounded-lg px-2.5 py-2"
          >
            {isLogoutPending ? <Spinner className="size-4" /> : <LogOut />}
            {t("ui.actions.logout")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
