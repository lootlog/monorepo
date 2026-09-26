import type { QueryClient } from "@tanstack/react-query";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { isReauthenticationError } from "@/lib/api-reauthentication";
import {
  forgetLastOrganization,
  getLastOrganization,
} from "@/lib/last-organization";
import { loadOrganization } from "@/lib/router/organization-loader";

export const restoreLastOrganization = async ({
  queryClient,
  userId,
  abortController,
}: {
  queryClient: QueryClient;
  userId: string;
  abortController: AbortController;
}): Promise<string | null> => {
  const guildId = getLastOrganization(userId);

  if (!guildId || abortController.signal.aborted) return null;

  try {
    const { guild } = await loadOrganization(queryClient, guildId, {
      startup: true,
    });

    return abortController.signal.aborted ? null : guild.id;
  } catch (error) {
    if (abortController.signal.aborted) return null;

    if (error instanceof Error && isReauthenticationError(error)) return null;

    const status = getApiErrorStatus(error);

    if (status === 403 || status === 404) {
      forgetLastOrganization(userId, guildId);
    }

    return null;
  }
};
