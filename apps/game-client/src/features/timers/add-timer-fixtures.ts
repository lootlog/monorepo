import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type SearchTimersNpcResponseDtoOutput,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createTimerGuildFixture, createTimerFixture } from "./timer-fixtures";
import { createTimerHttpFixture } from "./timer-http-fixtures";

export const createAddTimerFixture = ({
  hiddenGuildIds = [],
  npcResults = [],
}: {
  hiddenGuildIds?: string[];
  npcResults?: SearchTimersNpcResponseDtoOutput[];
} = {}) => {
  const fixture = createTimerHttpFixture((request) =>
    Response.json(
      request.method === "POST" ? createTimerFixture() : npcResults,
    ),
  );

  setTestRuntimeGame();
  useSettingsStore.setState({
    selectedGuildIdsForTimersByCharId: { "101": ["guild-2"] },
    guildIdByCharId: { "101": "guild-1" },
  });
  useWindowsStore.getState().setOpen("add-timer", true);
  fixture.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [
      createTimerGuildFixture(),
      createTimerGuildFixture({ id: "guild-2", name: "Beta" }),
    ],
  );
  fixture.queryClient.setQueryData<UserPreferencesResponseDtoOutput>(
    getUsersControllerGetUserPreferencesQueryKey(),
    (preferences) =>
      preferences ? { ...preferences, hiddenGuildIds } : preferences,
  );

  return {
    ...fixture,
    posts: () =>
      fixture.requests.filter((request) => request.method === "POST"),
  };
};
