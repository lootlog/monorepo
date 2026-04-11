import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { LogOut, Settings, User2 } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { authClient } from "@/lib/auth-client";
import { useUser } from "@/hooks/api/user/use-user";
import { useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { persister } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export const UserMenu = () => {
  const { user, isPending } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await authClient.signOut();
    queryClient.clear();
    await persister.removeClient();
    window.location.replace("/");
  };

  const handleOpenAccountSettings = () => {
    navigate({ to: ROUTES.user.settings.account });
  };

  return (
    <div className="flex border-t w-full h-14 items-center px-3 justify-between bg-sidebar">
      {isPending && (
        <Avatar className="cursor-pointer size-8 rounded-full">
          <AvatarImage src={undefined} />
          <AvatarFallback>
            <Spinner className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      {user && !isPending && (
        <div className="flex items-center justify-between gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex flex-row gap-4 items-center">
                <Avatar className="cursor-pointer size-8 rounded-full">
                  <AvatarImage src={user?.image ?? undefined} />
                  <AvatarFallback>
                    <User2 className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <div className="py-2 text-center">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("ui.actions.logout")}</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="h-full flex items-center">
            <span className="text-sm font-semibold">{user.name}</span>
          </div>
        </div>
      )}
      <div onClick={handleOpenAccountSettings}>
        <Settings className="cursor-pointer" size="24" />
      </div>
    </div>
  );
};
