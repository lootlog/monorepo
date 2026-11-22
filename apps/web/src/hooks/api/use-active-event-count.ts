import { useListEvents } from "@lootlog/client/main";

export const useActiveEventCount = (guildId: string) => {
  const { data: activeEvents } = useListEvents(
    { guildId },
    { activeOnly: true },
    { query: { enabled: Boolean(guildId) } },
  );

  return activeEvents?.length ?? 0;
};
