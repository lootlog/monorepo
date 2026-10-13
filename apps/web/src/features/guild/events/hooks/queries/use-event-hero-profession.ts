import {
  getEventsRankingControllerGetEventHeroStatsQueryKey,
  useEventsRankingControllerGetEventHeroStats,
} from "@lootlog/client/main";

type UseEventHeroProfessionOptions = {
  guildId: string;
  eventId: string;
  heroId: string;
};

/**
 * The event hero record has no profession; hero stats derive it from the
 * Organization's kills of that NPC.
 */
export const useEventHeroProfession = ({
  guildId,
  eventId,
  heroId,
}: UseEventHeroProfessionOptions) => {
  const { data: heroStats } = useEventsRankingControllerGetEventHeroStats(
    { guildId, eventId },
    {
      query: {
        enabled: Boolean(guildId && eventId),
        queryKey: getEventsRankingControllerGetEventHeroStatsQueryKey({
          guildId,
          eventId,
        }),
      },
    },
  );

  return heroStats?.find((stats) => stats.heroId === heroId)?.npcProf ?? null;
};
