import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchInput } from "@/components/ui/search-input";
import { useManageableGuilds } from "@/hooks/api/use-manageable-guilds";
import { FC, useState } from "react";
import { getGuildIconById } from "@/utils/get-guild-icon-by-id";
import { useDebounceValue } from "usehooks-ts";
import { DISCORD_BOT_PERMISSIONS, DISCORD_CLIENT_ID } from "@/config/discord";
import { useGlobalContext } from "@/hooks/use-global-context";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { cn } from "@lootlog/ui/lib/utils";

export const CreateGuildModal: FC = () => {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedValue] = useDebounceValue<string>(searchValue, 200);
  const { createGuildModal } = useGlobalContext();

  const { data: manageableGuilds } = useManageableGuilds();

  const handleAddToGuild = (guildId: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set("client_id", DISCORD_CLIENT_ID);
    searchParams.set("permissions", DISCORD_BOT_PERMISSIONS);
    searchParams.set("scope", "bot");
    searchParams.set("response_type", "code");
    searchParams.set("guild_id", guildId);
    searchParams.set("redirect_uri", `${window.location.origin}/init`);

    window.location.href = `https://discord.com/api/oauth2/authorize?${searchParams.toString()}`;
  };

  const handleModalClose = () => {
    createGuildModal.dispatch({ type: "CLOSE" });
  };

  const filteredGuilds = manageableGuilds?.filter((guild) =>
    guild.name.toLowerCase().includes(debouncedValue.toLowerCase())
  );

  return (
    <Dialog
      open={createGuildModal.state.isOpen}
      onOpenChange={handleModalClose}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowy lootlog</DialogTitle>
          <DialogDescription>
            Utwórz nowy lootlog dla swojego klanu
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 border-b">
          <SearchInput
            placeholder="Szukaj serwera..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        <ScrollArea className="min-h-80 max-h-80">
          <div className="flex flex-col">
            {filteredGuilds?.map((guild, index) => {
              const avatarSrc = getGuildIconById(guild.id, guild.icon);
              return (
                <div
                  key={guild.id}
                  className={cn(
                    "p-4 px-4 flex flex-row justify-between items-center border-b",
                    {
                      "border-none": index === filteredGuilds.length - 1,
                    }
                  )}
                >
                  <div className="flex flex-row gap-4 items-center">
                    <Avatar>
                      <AvatarImage src={avatarSrc} />
                      <AvatarFallback>{guild.name[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-md font-semibold">{guild.name}</p>
                  </div>
                  <Button onClick={() => handleAddToGuild(guild.id)} size="sm">
                    Dodaj
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
