import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  type SearchTimersNpcResponseDtoOutput,
} from "@lootlog/client/main";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createTimerGuildFixture, createTimerFixture } from "./timer-fixtures";
import { createTimerHttpFixture } from "./timer-http-fixtures";

export const createAddTimerFixture = ({
  npcResults = [],
  createStatus = 200,
}: {
  npcResults?: SearchTimersNpcResponseDtoOutput[];
  /** HTTP status the timer creation request answers with. */
  createStatus?: number;
} = {}) => {
  const fixture = createTimerHttpFixture((request) =>
    request.method === "POST"
      ? Response.json(createTimerFixture(), { status: createStatus })
      : Response.json(npcResults),
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
