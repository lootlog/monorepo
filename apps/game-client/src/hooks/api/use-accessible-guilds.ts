import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
  usersControllerGetCurrentUserAccessibleGuilds,
  type UserCurrentGuildResponseDtoOutput,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import {
  applyGameOrganizationAccess,
  getGameAccessPolicy,
  isOrganizationMetadataMissing,
} from "@/lib/game-access-cache";
import { readGameClientBootstrap } from "@/lib/game-client-bootstrap";

export const useAccessibleGuilds = (enabled = true) => {
  const queryClient = useQueryClient();
  const queryKey = getUsersControllerGetCurrentUserAccessibleGuildsQueryKey();

  return useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey,
      enabled,
      refetchOnMount: false,
      staleTime: 5 * 60_000,
      queryFn: async ({ signal }) => {
        const startingPolicy = getGameAccessPolicy(queryClient);

        let guilds =
          (await readGameClientBootstrap<UserCurrentGuildResponseDtoOutput[]>(
            queryKey,
          )) ??
          (await usersControllerGetCurrentUserAccessibleGuilds({ signal }));

        const policy = getGameAccessPolicy(queryClient);

        // A membership grant during the request can add an organization whose
        // name and icon were absent from the earlier authorized response.
        if (
          startingPolicy?.version !== policy?.version &&
          isOrganizationMetadataMissing(policy, guilds)
        )
          guilds = await usersControllerGetCurrentUserAccessibleGuilds({
            signal,
          });

        return applyGameOrganizationAccess(queryClient, guilds);
      },
    },
  });
};
