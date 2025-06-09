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
import { Loader2, PlusIcon, Settings, User2 } from "lucide-react";

export const UserMenu = () => {
  const { user, isPending } = useUser();

  return (
    <div className="flex border-t w-full h-16 items-center p-4 justify-between">
      {isPending && (
        <Avatar className="cursor-pointer h-10 w-10 rounded-lg">
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
                <Avatar className="cursor-pointer h-10 w-10 rounded-full">
                  <AvatarImage src={user?.image ?? undefined} />
                  <AvatarFallback>
                    <User2 className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-16 py-4">
                <p className="leading-7 [&:not(:first-child)]:mt-6">
                  {/* {data?.globalName ?? data?.username} */}
                  {user.name}
                </p>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700"></div>
              <div className="py-4 text-center">
                <DropdownMenuItem>
                  <PlusIcon className="mr-2 h-4 w-4" /> Dodaj serwer
                </DropdownMenuItem>
                {/* <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem> */}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <div>
            <span className="text-sm font-semibold">
              {/* {data?.globalName ?? data?.username} */}
              {user.name}
            </span>
          </div>
        </div>
      )}
      <div>
        <Settings className="cursor-pointer" size="24" />
      </div>
    </div>
  );
};
