import { useEventsRankingControllerGetEventHeroStats } from "@lootlog/client/main";

type UseEventHeroProfessionOptions = {
  guildId: string;
  eventId: string;
  heroId: string;
};

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
      },
    },
  );

  return heroStats?.find((stats) => stats.heroId === heroId)?.npcProf ?? null;
};
