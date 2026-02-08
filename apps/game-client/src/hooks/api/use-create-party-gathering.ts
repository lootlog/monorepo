import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { Game } from "@/lib/game";

export type UseCreatePartyGatheringOptions = {
  guildIds: string[];
  description?: string;
  minLvl?: number;
  maxLvl?: number;
};

export type CreatePartyGatheringResponse = {
  notificationId: string;
  guildIds?: string[];
};

export const useCreatePartyGathering = () => {
  const { client } = useAuthenticatedApiClient();

  return useMutation({
    mutationKey: ["create-party-gathering"],
    mutationFn: (options: UseCreatePartyGatheringOptions) => {
      const hero = Game.hero;
      const world = Game.getWorldName();

      return client.post<CreatePartyGatheringResponse>("/notifications/party-gathering", {
        guildIds: options.guildIds,
        world,
        character: {
          lvl: hero.lvl,
          nick: hero.nick,
          accountId: String(hero.account),
          characterId: String(hero.id),
          prof: hero.prof,
          icon: hero.img,
          clan: hero.clan ? { id: hero.clan.id, name: hero.clan.name } : undefined,
        },
        description: options.description,
        minLvl: options.minLvl,
        maxLvl: options.maxLvl,
      });
    },
  });
};
