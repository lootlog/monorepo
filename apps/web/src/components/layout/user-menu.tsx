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
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/api/use-user";
import { Loader2, LogOut, Settings, User2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export const UserMenu = () => {
  const { user, isPending } = useUser();

  const handleLogout = async () => {
    await authClient.signOut();
  };

  return (
    <div className="flex border-t w-full h-16 items-center p-3 justify-between">
      {isPending && (
        <Avatar className="cursor-pointer size-10 rounded-lg">
          <AvatarImage src={undefined} />
          <AvatarFallback>
            <Loader2 className="h-4 w-4 animate-spin" />
          </AvatarFallback>
        </Avatar>
      )}
      {user && !isPending && (
        <div className="flex items-center justify-between gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex flex-row gap-4 items-center">
                <Avatar className="cursor-pointer size-10 rounded-lg">
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
                  <span>Wyloguj się</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <div>
            <span className="text-sm font-semibold">{user.name}</span>
          </div>
        </div>
      )}
      <div>
        <Settings className="cursor-pointer" size="24" />
      </div>
    </div>
  );
};
