import {
  getMembersControllerGetGuildMemberReferencesQueryKey,
  type MemberReferenceResponseDtoOutput,
} from "@lootlog/client/main";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { createOrganizationTestWrapper } from "@/lib/testing/router";

export const createMemberDirectoryTestWrapper = async (
  members?: MemberReferenceResponseDtoOutput[],
) => {
  const OrganizationWrapper = await createOrganizationTestWrapper();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, ...(members && { staleTime: Infinity }) },
    },
  });

  if (members)
    queryClient.setQueryData(
      getMembersControllerGetGuildMemberReferencesQueryKey(
        { guildId: "guild-1" },
        { includeInactive: true },
      ),
      members,
    );

  return function MemberDirectoryTestWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <OrganizationWrapper>{children}</OrganizationWrapper>
      </QueryClientProvider>
    );
  };
};
