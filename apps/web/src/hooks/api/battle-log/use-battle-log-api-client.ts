import { battlelogApiClient } from "@/lib/api-client/api-client";

export const useBattleLogApiClient = () => {
  return { client: battlelogApiClient };
};
