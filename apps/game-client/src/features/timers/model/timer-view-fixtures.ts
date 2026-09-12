import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
} from "@lootlog/client/main";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/features/public-api/query-keys";
import { getGuildTimersDocumentsQueryKey } from "@/features/settings/persistence/settings-documents";
import { useTimerFiltersStore } from "@/features/timers/timer-filters.store";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";
import {
  createSettingsDocuments,
  seedSettingsDocumentValues,
  type SettingsDocumentValues,
} from "@/test/settings-documents-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import type { Timer } from "@/api/timers.api";
import { createTimerGuildFixture } from "./timer-fixtures";
import { createTimerHttpFixture } from "./timer-http-fixtures";

/** Seeds user-scoped timer settings (`timers.*`, `appearance.timers.*`) into the documents cache. */
export const seedTimerSettings = (
  queryClient: QueryClient,
  values: SettingsDocumentValues,
) => seedSettingsDocumentValues(queryClient, values);

/** Seeds the per-organization hidden/pinned lists the batched guild request returns. */
export const seedGuildTimerLists = (
  queryClient: QueryClient,
  listsByGuildId: Record<
    string,
    { hiddenTimers?: string[]; pinnedTimers?: string[] }
  >,
) => {
  const guildIds = Object.keys(listsByGuildId);

  queryClient.setQueryData(getGuildTimersDocumentsQueryKey(guildIds), {
    guilds: Object.fromEntries(
      guildIds.map((guildId) => [
        guildId,
        createSettingsDocuments(
          {
            "timers.hiddenTimers": listsByGuildId[guildId]?.hiddenTimers ?? [],
            "timers.pinnedTimers": listsByGuildId[guildId]?.pinnedTimers ?? [],
          },
          { type: "GUILD", id: guildId },
        ),
      ]),
    ),
  });
};

export const createTimerViewFixture = (
  timers: Timer[] = [],
  respond?: Parameters<typeof createTimerHttpFixture>[0],
) => {
  // The documents cache key includes the character, so the game runtime must
  // be set before the HTTP fixture seeds the settings documents.
  setTestRuntimeGame({ hero: { characterId: "101" }, world: "gefion" });
  const fixture = createTimerHttpFixture(respond);
  useTimerFiltersStore.setState({ timersFilters: {}, searchText: "" });
  seedTimerSettings(fixture.queryClient, {
    "timers.generalConfig": {
      removeTimerAfterMs: 30_000,
      timersGrouping: false,
      timersUnderBag: false,
      countdownMode: "max",
      compactView: false,
    },
    "timers.timerFiltersEnabled": false,
  });
  seedGuildTimerLists(fixture.queryClient, { "guild-1": {} });
  useSettingsStore.setState({
    allowWorldSelection: false,
    guildIdByCharId: { "101": "guild-1" },
    worldByGuildId: { "guild-1": "gefion" },
  });
  useWindowsStore.getState().setOpen("timers", true);
  fixture.queryClient.setQueryData(queryKeys.timers("gefion"), timers);
  fixture.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [createTimerGuildFixture()],
  );
  fixture.queryClient.setQueryData(
    getGuildsControllerGetGuildPermissionsQueryKey({ guildId: "guild-1" }),
    [],
  );
  const gameColumn = document.createElement("div");
  gameColumn.className = "right-column";
  gameColumn.innerHTML =
    '<div class="inner-wrapper"><div class="right-main-column-wrapper"><div class="bottom-wrapper"></div></div></div>';
  document.body.append(gameColumn);

  return {
    ...fixture,
    gameColumn,
    cleanup: () => {
      fixture.cleanup();
      gameColumn.remove();
    },
  };
};
