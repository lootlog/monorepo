import { render, screen } from "@testing-library/react";
import { expect, it, onTestFinished } from "vitest";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  type GlobalChatMessagesResponse,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import type { GlobalChatMessage } from "@lootlog/schema/chat";
import { CHAT_VISIBLE_MESSAGE_LIMIT } from "@/features/chat/chat.helpers";
import { useGlobalChatStore } from "@/store/global-chat.store";
import { useWindowsStore } from "@/store/windows.store";
import { createRealtimeTest } from "@/test/realtime-test";
import { measureRenders, waitForQuietTree } from "@/test/render-scenario";
import { GlobalChat } from "./global-chat";
import { useGlobalChatSync } from "./hooks/use-global-chat-sync";

const HISTORY_START_MS = Date.parse("2026-04-22T10:00:00.000Z");

const deliveredMessage = (index: number): GlobalChatMessage => ({
  id: `global-${index}`,
  displayName: `Gracz ${index % 11}`,
  message: `Globalna ${index}`,
  timestamp: new Date(HISTORY_START_MS + index * 1_000).toISOString(),
  originWorld: "luvia",
});

const GlobalChatWithSync = () => {
  useGlobalChatSync();

  return <GlobalChat />;
};

it("global chat appends one live message to a full history", async () => {
  const harness = createRealtimeTest();

  const page: GlobalChatMessagesResponse = {
    messages: Array.from({ length: CHAT_VISIBLE_MESSAGE_LIMIT }, (_, i) => ({
      ...deliveredMessage(i),
      isAdmin: false,
      isOwn: false,
    })),
    nextCursor: null,
    pinned: null,
    viewer: { isAdmin: false, muted: false, mutedUntil: null },
  };

  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
        fetch: (input) => {
          const url = new URL(
            input instanceof Request ? input.url : String(input),
          );

          if (url.pathname === "/global-chat/worlds")
            return Promise.resolve(Response.json({ worlds: ["luvia"] }));

          if (url.pathname === "/global-chat/messages")
            return Promise.resolve(Response.json(page));

          return Promise.reject(
            new Error(`Unexpected HTTP request: ${url.pathname}`),
          );
        },
      },
    }),
  );
  harness.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [{ id: "guild-1", name: "Guild" }],
  );
  useGlobalChatStore.setState(useGlobalChatStore.getInitialState(), true);
  useWindowsStore.getState().setOpen("global-chat", true);

  render(<GlobalChatWithSync />, { wrapper: harness.wrapper });
  harness.open();
  await harness.join(["guild-1"]);
  await screen.findByText(`Globalna ${CHAT_VISIBLE_MESSAGE_LIMIT - 1}`);
  await waitForQuietTree();

  await measureRenders("global-chat-append", () =>
    harness.receive({
      v: 1,
      type: "global-chat.created",
      data: deliveredMessage(CHAT_VISIBLE_MESSAGE_LIMIT),
    }),
  );

  expect(
    screen.getByText(`Globalna ${CHAT_VISIBLE_MESSAGE_LIMIT}`),
  ).toBeInTheDocument();
});
