import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type KillNpcData = {
  id: number;
  name: string;
  icon?: string;
  prof?: string;
  lvl: number;
  wt: number;
};

export type CreateKillParams = {
  world: string;
  npc: KillNpcData;
  characterId: string;
  accountId: string;
};

type CreateKillResponse = {
  updated: number;
};

export const useCreateKill = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["create-kill"],
    mutationFn: async (
      params: CreateKillParams,
    ): Promise<CreateKillResponse> => {
      const response = await client.post<CreateKillResponse>("/kills", params);
      return response.data;
    },
  });

  return mutation;
};
