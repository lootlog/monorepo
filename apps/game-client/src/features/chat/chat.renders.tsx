import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getMembersControllerGetMeQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
} from "@lootlog/client/main";
import { useChatStore } from "@/store/chat.store";
import { useWindowsStore } from "@/store/windows.store";
import { createChatMember, createChatMessage } from "@/test/chat-fixtures";
import { createRealtimeTest } from "@/test/realtime-test";
import { measureRenders, waitForQuietTree } from "@/test/render-scenario";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { CHAT_VISIBLE_MESSAGE_LIMIT } from "./chat.helpers";
import { Chat } from "./chat";

const HISTORY_START_MS = Date.parse("2026-04-22T10:00:00.000Z");

const historyMessage = (index: number) =>
  createChatMessage({
    id: `history-${index}`,
    senderId: `sender-${index % 7}`,
    message: `Historia ${index}`,
    timestamp: new Date(HISTORY_START_MS + index * 1_000).toISOString(),
  });

it("chat transcript receives one message on a full history", async () => {
  const harness = createRealtimeTest();

  const history = Array.from({ length: CHAT_VISIBLE_MESSAGE_LIMIT }, (_, i) =>
    historyMessage(i),
  );

  harness.chatHistoryRequest.mockImplementation(() =>
    Promise.resolve(Response.json(history)),
  );
  useChatStore.setState(useChatStore.getInitialState(), true);
  setTestRuntimeGame({ hero: { accountId: "1", characterId: "1" } });
  harness.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [{ id: "guild-1", name: "Guild" }],
  );
  harness.queryClient.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    { guildsOrder: [], hiddenGuildIds: [] },
  );
  harness.queryClient.setQueryData(
    getGuildsControllerGetGuildPermissionsQueryKey({ guildId: "guild-1" }),
    [],
  );
  harness.queryClient.setQueryData(
    getMembersControllerGetMeQueryKey({ guildId: "guild-1" }),
    createChatMember(),
  );
  useWindowsStore.getState().setOpen("chat", true);

  render(<Chat />, { wrapper: harness.wrapper });
  harness.open();
  await harness.join(["guild-1"]);
  await screen.findByText(`Historia ${CHAT_VISIBLE_MESSAGE_LIMIT - 1}`);
  await waitForQuietTree();

  await measureRenders("chat-transcript-append", () =>
    harness.receive({
      v: 1,
      type: "chat.created",
      data: {
        organizationId: "guild-1",
        payload: historyMessage(CHAT_VISIBLE_MESSAGE_LIMIT),
      },
    }),
  );

  expect(
    screen.getByText(`Historia ${CHAT_VISIBLE_MESSAGE_LIMIT}`),
  ).toBeInTheDocument();
});
