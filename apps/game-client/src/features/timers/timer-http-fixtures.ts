import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import { QueryClient } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { queryKeys } from "@/features/public-api/query-keys";
import {
  createTimerFixture,
  createTimerHistoryFixture,
} from "./timer-fixtures";

export const createTimerHttpFixture = (
  respond?: (request: Request) => Response | Promise<Response>,
) => {
  const requests: Request[] = [];
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [],
  );
  const preferences: UserPreferencesResponseDtoOutput = {
    userId: "user-1",
    guildsOrder: [],
    hiddenGuildIds: [],
    theme: "default",
    chatAppearance: { ...CHAT_APPEARANCE_READABLE_PRESET },
    mutes: { players: [], npcs: [] },
  };
  queryClient.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    preferences,
  );
  const history = createTimerHistoryFixture();
  const restored = createTimerFixture({
    timerKey: history.timerKey,
    npcId: history.npcId,
  });
  queryClient.setQueryData(queryKeys.timers("pandora"), []);
  const restoreApi = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        return Promise.resolve(
          respond
            ? respond(request)
            : Response.json(request.method === "POST" ? restored : [history]),
        );
      },
    },
  });
  return {
    queryClient,
    requests,
    history,
    restored,
    cleanup: () => {
      queryClient.clear();
      restoreApi();
    },
  };
};
