import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { Game } from "@/lib/game";

export type UseVolunteerOptions = {
  notificationId: string;
  targetDiscordId: string;
  world: string;
};

export const useVolunteer = () => {
  const { client } = useAuthenticatedApiClient();

  return useMutation({
    mutationKey: ["volunteer"],
    mutationFn: (options: UseVolunteerOptions) => {
      const hero = Game.hero;
      return client.post(`/notifications/${options.notificationId}/volunteer`, {
        world: options.world,
        targetDiscordId: options.targetDiscordId,
        character: {
          lvl: hero.lvl,
          nick: hero.nick,
          accountId: String(hero.account),
          characterId: String(hero.id),
          prof: hero.prof,
          icon: hero.img,
          clan: hero.clan
            ? { id: hero.clan.id, name: hero.clan.name }
            : undefined,
        },
      });
    },
  });
};
