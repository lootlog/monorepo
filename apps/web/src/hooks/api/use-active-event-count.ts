import { useListEvents } from "@lootlog/client/main";

/**
 * How many events of the Organization run now, which navigation shows as a
 * badge on Events. An empty `guildId`, for a member who cannot see events,
 * skips the request.
 */
export const useActiveEventCount = (guildId: string) => {
  const { data: activeEvents } = useListEvents(
    { guildId },
    { activeOnly: true },
    { query: { enabled: Boolean(guildId) } },
  );

  return activeEvents?.length ?? 0;
};
