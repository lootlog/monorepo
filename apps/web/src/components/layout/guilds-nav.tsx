import { GuildNavCreate } from "@/components/layout/guild-nav-create";
import { GuildNavItem } from "@/components/layout/guild-nav-item";
import { InstallButton } from "@/components/layout/install-button";
import { UserNavItem } from "@/components/layout/user-nav-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useGuilds } from "@/hooks/api/use-guilds";
import { FC } from "react";

export const GuildsNav: FC = () => {
  const { data: guilds } = useGuilds();

  return (
    <div className="flex h-full flex-col gap-2 w-16 border-r border-solid pt-2">
      <UserNavItem />
      <Separator className="-mt-[1px]" />
      <ScrollArea className="flex-1 flex flex-col gap-2">
        {guilds?.map((guild) => (
          <div
            key={guild.id}
            className="w-full flex items-center justify-center mb-1"
          >
            <GuildNavItem guild={guild} />
          </div>
        ))}
      </ScrollArea>
      <Separator />
      <div className="flex items-center justify-center">
        <GuildNavCreate />
      </div>
      <Separator />
      <div className="flex items-center justify-center pb-2">
        <InstallButton />
      </div>
    </div>
  );
};
