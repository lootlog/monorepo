import { battleLogApiClient } from "@/src/lib/battle-log-api-client";

export const useBattleLogApiClient = () => {
  return { client: battleLogApiClient };
};
