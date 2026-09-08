import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
} from "@lootlog/client/main";
import { queryKeys } from "@/features/public-api/query-keys";
import { useTimersStore } from "@/store/timers.store";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import type { Timer } from "@/api/timers.api";
import { createTimerGuildFixture } from "./timer-fixtures";
import { createTimerHttpFixture } from "./timer-http-fixtures";

export const createTimerViewFixture = (timers: Timer[] = []) => {
  const fixture = createTimerHttpFixture();
  useTimersStore.setState(useTimersStore.getInitialState(), true);
  useTimersStore.setState((state) => ({
    generalConfig: {
      ...state.generalConfig,
      removeTimerAfterMs: 30_000,
      timersGrouping: false,
      countdownMode: "max",
      compactView: false,
    },
    timerFiltersEnabled: false,
  }));
  useSettingsStore.setState({
    allowWorldSelection: false,
    guildIdByCharId: { "101": "guild-1" },
    worldByGuildId: { "guild-1": "gefion" },
  });
  useWindowsStore.getState().setOpen("timers", true);
  setTestRuntimeGame({ hero: { characterId: "101" }, world: "gefion" });
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
