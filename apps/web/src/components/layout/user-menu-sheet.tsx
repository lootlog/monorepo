import { Button } from "@lootlog/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@lootlog/ui/components/drawer";
import { useSidebar } from "@lootlog/ui/components/sidebar";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Blocks, ChevronRight, LogOut, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SIGNAL_DOT_COLOR,
  SIGNAL_LABEL_COLOR,
  useUserMenu,
} from "@/components/layout/use-user-menu";
import { UserSignalAvatar } from "@/components/layout/user-signal-avatar";

/** A 44px row, inset like the navigation rows above it. */
const ROW_CLASS =
  "h-11 w-full justify-start gap-3 px-3 font-medium text-foreground [&_svg]:text-muted-foreground";

/**
 * The account at the foot of the phone navigation sheet: a row like the
 * sections above it, which opens the account's actions as a sheet stacked
 * over the navigation instead of the desktop popover.
 */
export const UserMenuSheet = () => {
  const { t } = useTranslation();
  const { setOpenMobile } = useSidebar();

  const {
    user,
    isPending,
    signal,
    settingsLinks,
    logout,
    isLogoutPending,
    openInstallAddon,
  } = useUserMenu();

  const closeNavigation = () => setOpenMobile(false);

  if (!user) {
    return (
      <div className="flex h-14 items-center gap-3 px-5">
        {isPending && (
          <>
            <Skeleton className="size-9 rounded-full" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </>
        )}
      </div>
    );
  }

  const status = (
    <span
      role="status"
      className={cn(
        "truncate text-xs leading-none",
        SIGNAL_LABEL_COLOR[signal],
      )}
    >
      {t(`layout.userMenu.${signal}`)}
    </span>
  );

  return (
    <Drawer>
      <div className="px-2 py-1.5">
        <DrawerTrigger
          render={
            <button
              type="button"
              className="flex h-14 w-full items-center gap-3 rounded-lg px-3 text-left text-sidebar-foreground transition-colors hover:bg-sidebar-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            />
          }
        >
          <UserSignalAvatar
            image={user.image}
            signal={signal}
            className="size-9 [--signal-surface:var(--sidebar)]"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="truncate text-sm font-semibold leading-none">
              {user.name}
            </span>
            {status}
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        </DrawerTrigger>
      </div>
      <DrawerContent className="bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 px-5 pt-3 pb-4">
          <UserSignalAvatar
            image={user.image}
            signal={signal}
            className="size-12 [--signal-surface:var(--sidebar)]"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <DrawerTitle className="truncate text-base leading-none">
              {user.name}
            </DrawerTitle>
            {user.email && (
              <span className="truncate text-xs leading-none text-muted-foreground">
                {user.email}
              </span>
            )}
          </div>
          <DrawerClose
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={t("common.close")}
                className="shrink-0 rounded-full bg-sidebar-accent/60 text-muted-foreground hover:text-foreground"
              />
            }
          >
            <X aria-hidden="true" />
          </DrawerClose>
        </div>
        <div className="mx-4 flex gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5">
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
            <DrawerDescription className="text-xs leading-snug">
              {t(`layout.userMenu.${signal}Description`)}
            </DrawerDescription>
          </div>
        </div>
        <ul className="flex flex-col gap-0.5 px-2 pt-3">
          {settingsLinks.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link to={to} onClick={closeNavigation} />}
                className={ROW_CLASS}
              >
                <Icon aria-hidden="true" />
                {label}
              </Button>
            </li>
          ))}
        </ul>
        <div className="mx-4 my-2 h-px bg-sidebar-border" />
        <div className="px-2">
          <Button
            variant="ghost"
            className={ROW_CLASS}
            onClick={() => {
              closeNavigation();
              openInstallAddon();
            }}
          >
            <Blocks aria-hidden="true" />
            {t("layout.userMenu.installAddon")}
          </Button>
        </div>
        <div className="mx-4 my-2 h-px bg-sidebar-border" />
        <div className="px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            variant="ghost"
            disabled={isLogoutPending}
            onClick={logout}
            className={cn(
              ROW_CLASS,
              "text-destructive hover:text-destructive [&_svg]:text-destructive",
            )}
          >
            {isLogoutPending ? <Spinner className="size-4" /> : <LogOut />}
            {t("ui.actions.logout")}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
