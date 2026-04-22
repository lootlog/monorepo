import { GuildSwitcher } from "@/components/guild-switcher";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorldSelector } from "@/components/world-selector";
import { OnlinePlayersListEntry } from "@/features/online-players/components/online-players-list-entry";
import { usePlayersPresence } from "@/features/online-players/hooks/use-players-presence";
import { useSettingsStore } from "@/store/settings.store";
import { useGuildMembersSummary } from "@/hooks/api/guild-members-summary-query";
import { useMemberInvalidation } from "@/hooks/api/use-member-invalidation";
import { mapGuildMembersByUserId } from "@/lib/api/generated-helpers";
import { Search } from "lucide-react";
import { useState, useMemo, type FC } from "react";
import { Game } from "@/lib/game";
import { useTranslation } from "react-i18next";

export const OnlinePlayersList: FC = () => {
  const { t } = useTranslation("onlinePlayers");
  const characterId = String(Game.hero.id);
  const defaultWorld = Game.getWorldName();

  const { allowWorldSelection, guildIdByCharId, worldByGuildId } =
    useSettingsStore();
  const guildId = guildIdByCharId[characterId];
  const world = guildId ? worldByGuildId[guildId] : undefined;
  const [onlinePlayers] = usePlayersPresence(guildId, world || defaultWorld);
  const { data: guildMembers } = useGuildMembersSummary(
    { guildId: guildId ?? "" },
    {
      query: {
        enabled: !!guildId && guildId !== "all",
        select: mapGuildMembersByUserId,
      },
    },
  );
  const [searchQuery, setSearchQuery] = useState("");

  const missingMemberIds = useMemo(() => {
    if (!guildMembers) return [];
    return Object.keys(onlinePlayers).filter(
      (discordId) => !guildMembers[discordId],
    );
  }, [onlinePlayers, guildMembers]);

  useMemberInvalidation(guildId, missingMemberIds);

  const onlinePlayersList = useMemo(() => {
    if (!searchQuery) return Object.entries(onlinePlayers);

    const query = searchQuery.toLowerCase();
    return Object.entries(onlinePlayers).filter(([discordId, presences]) => {
      const memberName = guildMembers?.[discordId]?.name?.toLowerCase() ?? "";
      const hasMatchingMember = memberName.includes(query);
      const hasMatchingCharacter = presences.some((presence) =>
        presence.player?.name?.toLowerCase().includes(query),
      );

      return hasMatchingMember || hasMatchingCharacter;
    });
  }, [onlinePlayers, searchQuery, guildMembers]);

  return (
    <div className="ll:h-full ll:w-full">
      <div className="ll:flex ll:flex-col ll:h-full ll:overflow-hidden">
        <div className="ll:pt-1 ll:flex ll:gap-1 ll:pb-1">
          <GuildSwitcher />
        </div>
        {allowWorldSelection && <WorldSelector />}

        <div className="ll:pb-1 ll:relative">
          <Input
            type="text"
            placeholder={t("search.placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ll:pr-7"
          />
          <Search className="ll:absolute ll:right-2 ll:top-[calc(50%-0.6rem)] ll:w-3.5 ll:h-3.5 ll:text-gray-400 ll:pointer-events-none" />
        </div>
        <ScrollArea className="ll:flex-1 ll:box-border ll:mt-1" type="hover">
          {onlinePlayersList.length > 0 ? (
            onlinePlayersList.map(([discordId, presences]) => (
              <OnlinePlayersListEntry
                key={discordId}
                presences={presences}
                guildMember={guildMembers?.[discordId]}
              />
            ))
          ) : (
            <p className="ll:text-gray-400 ll:w-full ll:flex ll:items-center ll:justify-center ll:mt-6">
              {searchQuery
                ? t("emptyState.notFound")
                : t("emptyState.noPlayers")}
            </p>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
