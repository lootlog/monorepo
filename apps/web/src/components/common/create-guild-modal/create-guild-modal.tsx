import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SearchInput } from "@/components/ui/search-input";
import { useState, type FC } from "react";
import { getGuildIconById } from "@/utils/get-guild-icon-by-id";
import { buildDiscordBotInstallUrl } from "@/utils/build-discord-bot-install-url";
import { useDebounceValue } from "usehooks-ts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { cn } from "@lootlog/ui/lib/utils";
import { useGlobalContext } from "@/hooks/context/use-global-context";
import { useTranslation } from "react-i18next";
import {
  getGuildsControllerGetManageableUserGuildsQueryKey,
  useGuildsControllerGetManageableUserGuilds,
} from "@/lib/api/generated/main/guilds/guilds";

export const CreateGuildModal: FC = () => {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedValue] = useDebounceValue<string>(searchValue, 200);
  const { createGuildModal } = useGlobalContext();
  const { t } = useTranslation();

  const { data: manageableGuilds } = useGuildsControllerGetManageableUserGuilds(
    {
      query: {
        queryKey: getGuildsControllerGetManageableUserGuildsQueryKey(),
        enabled: createGuildModal.state.isOpen,
        staleTime: 0,
      },
    },
  );

  const handleAddToGuild = (guildId: string) => {
    window.location.assign(buildDiscordBotInstallUrl(guildId));
  };

  const handleModalClose = () => {
    createGuildModal.dispatch({ type: "CLOSE" });
  };

  const filteredGuilds = manageableGuilds?.filter((guild) =>
    guild.name.toLowerCase().includes(debouncedValue.toLowerCase()),
  );

  return (
    <Dialog
      open={createGuildModal.state.isOpen}
      onOpenChange={handleModalClose}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("ui.modals.createLootlog.title")}</DialogTitle>
          <DialogDescription>
            {t("ui.modals.createLootlog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 border-b">
          <SearchInput
            placeholder={t("ui.modals.createLootlog.searchPlaceholder")}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        <ScrollArea className="min-h-80 max-h-80">
          <div className="flex flex-col">
            {filteredGuilds?.map((guild, index) => {
              const avatarSrc = getGuildIconById(guild.id, guild.icon ?? null);
              return (
                <div
                  key={guild.id}
                  className={cn(
                    "p-4 px-4 flex flex-row justify-between items-center border-b",
                    {
                      "border-none": index === filteredGuilds.length - 1,
                    },
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
                    {t("ui.actions.add")}
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
