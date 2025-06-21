import { GuildNavCreate } from "@/components/layout/guild-nav-create";
import { GuildNavItem } from "@/components/layout/guild-nav-item";
import { InstallButton } from "@/components/layout/install-button";
import { UserNavItem } from "@/components/layout/user-nav-item";
import { Separator } from "@/components/ui/separator";
import { useGuilds } from "@/hooks/api/use-guilds";
import { FC } from "react";

export const GuildsNav: FC = () => {
  const { data: guilds } = useGuilds();

  return (
    <div className="flex h-full flex-col gap-2 w-16 border-r border-solid pt-2">
      <div className="flex flex-col gap-2 items-center flex-1">
        <UserNavItem />
        <Separator className="-mt-[1px]" />
        {guilds?.map((guild) => (
          <div
            key={guild.id}
            className="w-full flex items-center justify-center"
          >
            <GuildNavItem guild={guild} />
          </div>
        ))}
        <Separator />
        <GuildNavCreate />
      </div>
      <Separator />
      <div className="flex items-center justify-center pb-2">
        <InstallButton />
      </div>
    </div>
  );
};
