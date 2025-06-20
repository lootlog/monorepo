import { useMutation } from "@tanstack/react-query";
import { Item } from "@/types/margonem/game-events/item";
import { Npc, PartyMember } from "@/utils/game/get-battle-participants";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type LootDto = {
  id: number;
  hid: string;
  icon: string;
  name: string;
  pr: number;
  prc: string;
  stat: string;
  cl: number;
};

export type CreateLootOptions = {
  loots: LootDto[];
};

export type UseCreateLootOptions = {
  npcs: Npc[];
  players: PartyMember[];
  loots: Partial<Item>[];
  source: string;
  world: string;
  accountId: string;
  characterId: string;
  location: string;
};

export const useCreateLoot = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["create-loot"],
    mutationFn: (options: UseCreateLootOptions) => {
      return client.post("/loots", options);
    },
    onSuccess: () => {
      console.log("onSuccess");
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
