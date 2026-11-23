import { useUsersControllerGetUserLimits } from "@lootlog/client/main";

export const useUserLimits = () =>
  useUsersControllerGetUserLimits({ query: { staleTime: 60_000 } });
