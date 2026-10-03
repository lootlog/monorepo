import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/common/empty-state";
import { useState, type FC } from "react";
import { getGuildIconById } from "@/utils/get-guild-icon-by-id";
import { buildDiscordBotInstallUrl } from "@/utils/build-discord-bot-install-url";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Info, SearchX, ServerOff, TriangleAlert } from "lucide-react";
import { useGlobalContext } from "@/hooks/context/use-global-context";
import { useTranslation } from "react-i18next";
import {
  getGuildsControllerGetManageableUserGuildsQueryKey,
  useGuildsControllerGetManageableUserGuilds,
} from "@lootlog/client/main";

const handleAddToGuild = (guildId: string) => {
  window.location.assign(buildDiscordBotInstallUrl(guildId));
};

export const CreateGuildModal: FC = () => {
  const [searchValue, setSearchValue] = useState("");
  const debouncedValue = useDebounce(searchValue, 200);
  const { createGuildModal } = useGlobalContext();
  const { t } = useTranslation();

  const manageableGuildsQuery = useGuildsControllerGetManageableUserGuilds({
    query: {
      queryKey: getGuildsControllerGetManageableUserGuildsQueryKey(),
      enabled: createGuildModal.state.isOpen,
      staleTime: 0,
    },
  });

  const manageableGuilds = manageableGuildsQuery.data;

  const handleModalClose = () => {
    createGuildModal.dispatch({ type: "CLOSE" });
  };

  const filteredGuilds = manageableGuilds?.filter((guild) =>
    guild.name.toLowerCase().includes(debouncedValue.toLowerCase()),
  );

  const retryButton = (label: string) => (
    <Button
      variant="outline"
      loading={manageableGuildsQuery.isFetching}
      onClick={() => void manageableGuildsQuery.refetch()}
    >
      {label}
    </Button>
  );

  const renderGuilds = () => {
    if (manageableGuildsQuery.isPending) {
      return (
        <div
          role="status"
          aria-label={t("common.loading")}
          className="flex flex-col"
        >
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="flex items-center gap-4 border-b p-4 last:border-none"
            >
              <Skeleton className="size-8 rounded-full motion-reduce:animate-none" />
              <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      );
    }

    if (!manageableGuilds) {
      return (
        <EmptyState
          icon={TriangleAlert}
          title={t("ui.modals.createLootlog.loadError")}
          compact
          action={retryButton(t("ui.modals.createLootlog.retry"))}
        />
      );
    }

    if (manageableGuilds.length === 0) {
      return (
        <EmptyState
          icon={ServerOff}
          title={t("ui.modals.createLootlog.empty.title")}
          description={t("ui.modals.createLootlog.empty.description")}
          compact
          action={retryButton(t("ui.modals.createLootlog.empty.action"))}
        />
      );
    }

    if (filteredGuilds?.length === 0) {
      return (
        <EmptyState
          icon={SearchX}
          title={t("ui.modals.createLootlog.emptySearch.title")}
          description={t("ui.modals.createLootlog.emptySearch.description")}
          compact
        />
      );
    }

    return (
      <ul
        aria-label={t("ui.modals.createLootlog.serversLabel")}
        className="flex flex-col"
      >
        {filteredGuilds?.map((guild) => {
          const avatarSrc = getGuildIconById(guild.id, guild.icon ?? null);

          return (
            <li
              key={guild.id}
              className="flex flex-row items-center justify-between gap-4 border-b p-4 last:border-none"
            >
              <div className="flex min-w-0 flex-row items-center gap-4">
                <Avatar>
                  <AvatarImage src={avatarSrc} alt="" />
                  <AvatarFallback>{guild.name[0]}</AvatarFallback>
                </Avatar>
                <p className="truncate text-md font-semibold">{guild.name}</p>
              </div>
              <Button
                onClick={() => handleAddToGuild(guild.id)}
                size="sm"
                aria-label={t("ui.modals.createLootlog.addToServer", {
                  name: guild.name,
                })}
              >
                {t("ui.actions.add")}
              </Button>
            </li>
          );
        })}
      </ul>
    );
  };

  const hasGuilds = (manageableGuilds?.length ?? 0) > 0;

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
        {(hasGuilds || manageableGuildsQuery.isPending) && (
          <div className="p-4 border-b">
            <SearchInput
              placeholder={t("ui.modals.createLootlog.searchPlaceholder")}
              aria-label={t("ui.modals.createLootlog.searchPlaceholder")}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        )}
        <ScrollArea className="[&>[data-slot=scroll-area-viewport]]:max-h-80">
          {renderGuilds()}
        </ScrollArea>
        <section
          aria-labelledby="create-lootlog-not-admin-title"
          className="flex items-start gap-3 border-t border-border/70 bg-muted/20 p-4"
        >
          <Info
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0">
            <h3
              id="create-lootlog-not-admin-title"
              className="text-sm font-semibold text-foreground"
            >
              {t("ui.modals.createLootlog.notAdmin.title")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("ui.modals.createLootlog.notAdmin.description")}
            </p>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
};
