import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { ChevronUp, LogOut, Settings, User2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useUser } from "@/hooks/api/user/use-user";
import { useLogout } from "@/hooks/auth/use-logout";
import { useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { useTranslation } from "react-i18next";
import { useGateway } from "@/hooks/utils/use-gateway";

export const UserMenu = () => {
  const { user, isPending } = useUser();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { logout, isPending: isLogoutPending } = useLogout();
  const { joined } = useGateway();

  const handleOpenAccountSettings = () => {
    navigate({ to: ROUTES.user.settings.account });
  };

  return (
    <div className="flex h-14 w-full items-stretch bg-sidebar">
      {isPending && (
        <div className="flex flex-1 items-center gap-2.5 pl-2">
          <Avatar className="size-8 rounded-full">
            <AvatarFallback>
              <Spinner className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <div className="flex h-8 w-12 shrink-0 items-center justify-center border-l border-sidebar-border">
            <Skeleton className="size-3.5" />
          </div>
        </div>
      )}
      {user && !isPending && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="group flex h-full w-full cursor-pointer items-center gap-2.5 pl-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=open]:bg-sidebar-accent/45"
              >
                <div className="relative shrink-0">
                  <Avatar className="size-8 rounded-full ring-1 ring-sidebar-border transition-[box-shadow] group-hover:ring-primary/45">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback>
                      <User2 className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <span className="text-[11px] font-medium leading-none text-sidebar-foreground/55">
                    {t("layout.userMenu.account")}
                  </span>
                  <span className="max-w-full truncate text-sm font-bold leading-none">
                    {user.name}
                  </span>
                </div>
                <span
                  role="status"
                  title={t("layout.userMenu.connectionDescription")}
                  className="flex shrink-0 items-center gap-1.5 text-[10px] text-sidebar-foreground/75"
                >
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-full ${joined ? "bg-emerald-400" : "bg-amber-400"}`}
                  />
                  {t(
                    joined
                      ? "layout.userMenu.connected"
                      : "layout.userMenu.disconnected",
                  )}
                </span>
                <span className="flex h-8 w-12 shrink-0 items-center justify-center border-l border-sidebar-border text-sidebar-foreground/55 transition-colors group-hover:text-sidebar-foreground">
                  <ChevronUp className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
                </span>
              </button>
            }
          />
          <DropdownMenuContent
            align="start"
            alignOffset={8}
            side="top"
            sideOffset={10}
            className="w-[calc(var(--anchor-width)-1rem)] min-w-64 overflow-hidden rounded-xl border-border bg-popover p-0 shadow-[0_14px_34px_-18px_rgba(0,0,0,0.65)]"
          >
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar className="size-9 rounded-full ring-1 ring-border">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback>
                    <User2 className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">
                    {user.name}
                  </span>
                  {user.email && (
                    <span className="truncate text-[11px] text-muted-foreground">
                      {user.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenuSeparator className="m-0" />
            <div className="p-1.5">
              <DropdownMenuItem
                onClick={handleOpenAccountSettings}
                className="rounded-lg px-2.5 py-2"
              >
                <Settings className="size-4" />
                <span>{t("layout.navigation.settings")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                closeOnClick={false}
                disabled={isLogoutPending}
                render={
                  <Button
                    variant="ghost"
                    loading={isLogoutPending}
                    icon={<LogOut className="size-4" />}
                  />
                }
                onClick={logout}
                className="w-full justify-start rounded-lg px-2.5 py-2"
              >
                <span>{t("ui.actions.logout")}</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
