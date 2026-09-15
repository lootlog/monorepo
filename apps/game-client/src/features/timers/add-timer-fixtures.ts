import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  type SearchTimersNpcResponseDtoOutput,
} from "@lootlog/client/main";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createTimerGuildFixture, createTimerFixture } from "./timer-fixtures";
import { createTimerHttpFixture } from "./timer-http-fixtures";

export const createAddTimerFixture = ({
  npcResults = [],
}: {
  npcResults?: SearchTimersNpcResponseDtoOutput[];
} = {}) => {
  const fixture = createTimerHttpFixture((request) =>
    Response.json(
      request.method === "POST" ? createTimerFixture() : npcResults,
    ),
  );

  setTestRuntimeGame();
  fixture.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [createTimerGuildFixture()],
  );

  return {
    ...fixture,
    posts: () =>
      fixture.requests.filter((request) => request.method === "POST"),
  };
};
