import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { queryKeys } from "@/features/public-api/query-keys";
import { settingsPatchQueue } from "@/features/settings/persistence/settings-patch-client";
import { queryClient } from "@/lib/query-client";
import {
  createSettingsDocuments,
  readSeededSettingsDocuments,
  seedSettingsDocuments,
} from "@/test/settings-documents-fixtures";
import {
  createTimerFixture,
  createTimerHistoryFixture,
} from "./timer-fixtures";

const PREFERENCES_PATH = "/preferences";

/**
 * Real HTTP boundary for timer tests on the shared query client, so writes
 * through the settings patch queue land in the same cache the hooks read.
 * Settings saves answer with the seeded documents; other requests go to
 * `respond` or default to the history fixture.
 */
export const createTimerHttpFixture = (
  respond?: (request: Request) => Response | Promise<Response>,
) => {
  const requests: Request[] = [];

  queryClient.clear();
  settingsPatchQueue.reset();
  queryClient.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
    mutations: { retry: false },
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
  seedSettingsDocuments(queryClient, createSettingsDocuments());
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
        const { pathname } = new URL(request.url);

        if (
          pathname === PREFERENCES_PATH ||
          pathname.startsWith(`${PREFERENCES_PATH}/`)
        ) {
          return Promise.resolve(
            Response.json(
              pathname === PREFERENCES_PATH
                ? readSeededSettingsDocuments(queryClient)
                : { guilds: {} },
            ),
          );
        }

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
      settingsPatchQueue.reset();
      queryClient.clear();
      restoreApi();
    },
  };
};
