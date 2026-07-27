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
import { ChevronsUpDown, Settings, User2 } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useUser } from "@/hooks/api/user/use-user";
import { useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { useTranslation } from "react-i18next";

export const UserMenu = () => {
  const { user, isPending } = useUser();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleOpenAccountSettings = () => {
    navigate({ to: ROUTES.user.settings.account });
  };

  return (
    <div className="flex h-14 w-full items-center bg-sidebar px-2">
      {isPending && (
        <div className="flex flex-1 items-center gap-2.5 px-1">
          <Avatar className="size-8 rounded-full">
            <AvatarFallback>
              <Spinner className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-2 w-14 animate-pulse rounded bg-muted/60" />
          </div>
        </div>
      )}
      {user && !isPending && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-accent/50 cursor-pointer"
            >
              <div className="relative">
                <Avatar className="size-8 rounded-full ring-1 ring-border transition-shadow group-hover:ring-primary/40 group-hover:shadow-[0_0_8px_var(--primary)/0.15]">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback>
                    <User2 className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-sm font-semibold truncate max-w-full">
                  {user.name}
                </span>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="w-56 p-0 overflow-hidden"
          >
            <div className="px-3 py-3 bg-accent/30">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 rounded-full ring-1 ring-border">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback>
                    <User2 className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold truncate">
                    {user.name}
                  </span>
                  {user.email && (
                    <span className="text-[11px] text-muted-foreground truncate">
                      {user.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenuSeparator className="m-0" />
            <div className="p-1">
              <DropdownMenuItem
                onClick={handleOpenAccountSettings}
                className="rounded-md"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>{t("layout.navigation.settings")}</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
