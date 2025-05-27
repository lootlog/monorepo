import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAuthToken } from "../auth/use-auth-token";
import { API_URL } from "@/config/api";
import { Item } from "@/types/margonem/game-events/item";
import { KilledNpc, PartyMember } from "@/utils/game/get-battle-participants";

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
  npcs: KilledNpc[];
  players: PartyMember[];
  loots: Partial<Item>[];
  world: string;
};

export const useCreateLoot = () => {
  const token = useAuthToken();

  const mutation = useMutation({
    mutationKey: ["create-loot"],
    mutationFn: (options: UseCreateLootOptions) => {
      return axios.post(`${API_URL}/loots`, options, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
