import { type toast as SonnerToast, toast } from "sonner";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type ChatMessageResponseDtoOutput,
} from "@lootlog/client/main";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowsStore } from "@/store/windows.store";
import { useChatStore } from "@/store/chat.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createTestGuild } from "@/test/guild-preferences-test";
import { COMMAND_DRAFT_KEY } from "./command-draft";
import { CommandWindow } from "./command";

vi.mock("sonner", () => ({
  toast: { error: vi.fn<typeof SonnerToast.error>() },
}));

const notificationRequest = vi.fn<typeof fetch>();

const chatRequest = vi.fn<typeof fetch>();

let queryClient: QueryClient;

let restoreApi: () => void;

const mount = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <CommandWindow />
    </QueryClientProvider>,
  );

const getEditor = () => screen.getByRole("textbox", { name: "Wiadomość…" });

const getDraft = () =>
  useChatStore.getState().draftsByGuild[COMMAND_DRAFT_KEY] ?? "";

const type = async (text: string) => {
  const user = userEvent.setup();
  await user.click(getEditor());
  await user.paste(text);

  return user;
};

const sentMessage = (guildId: string): ChatMessageResponseDtoOutput => ({
  id: `message-${guildId}`,
  guildId,
  message: "hello",
  senderId: "user-1",
  timestamp: "2026-01-01T10:00:00.000Z",
  type: "NORMAL",
  characterData: {
    nick: "Hero",
    id: 123,
    acc: 456,
    lvl: 200,
    prof: "w",
    icon: "hero.gif",
  },
  canDelete: false,
});

const requestPath = (request: Parameters<typeof fetch>[0]) =>
  new URL(request instanceof Request ? request.url : String(request)).pathname;

beforeEach(() => {
  vi.clearAllMocks();
  setTestRuntimeGame({
    world: "tempest",
    hero: {
      accountId: "456",
      characterId: "123",
      name: "Hero",
      level: 200,
      profession: "w",
      icon: "hero.gif",
    },
  });
  useWindowsStore.setState(useWindowsStore.getInitialState(), true);
  useWindowsStore.getState().setOpen("command", true);
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [createTestGuild("guild-1", "Alpha"), createTestGuild("guild-2", "Beta")],
  );
  queryClient.setQueryData(getUsersControllerGetUserPreferencesQueryKey(), {
    userId: "user",
    guildsOrder: [],
    hiddenGuildIds: [],
    theme: "default",
    chatAppearance: CHAT_APPEARANCE_READABLE_PRESET,
    mutes: { players: [], npcs: [] },
  });

  for (const guildId of ["guild-1", "guild-2"]) {
    queryClient.setQueryData(
      getGuildsControllerGetGuildPermissionsQueryKey({ guildId }),
      [],
    );
  }

  chatRequest
    .mockReset()
    .mockImplementation(async (input) =>
      Response.json(sentMessage(requestPath(input).split("/")[2] ?? "")),
    );
  notificationRequest.mockReset();
  restoreApi = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: (input, init) => {
        const pathname = new URL(
          input instanceof Request ? input.url : String(input),
        ).pathname;

        if (pathname.startsWith("/messaging"))
          return notificationRequest(input, init);

        if (pathname.endsWith("/chat-messages"))
          return chatRequest(input, init);
        throw new Error(`Unexpected HTTP request: ${pathname}`);
      },
    },
  });
});

afterEach(() => {
  restoreApi();
  queryClient.clear();
  useChatStore.setState(useChatStore.getInitialState(), true);
  useWindowsStore.setState(useWindowsStore.getInitialState(), true);
  vi.restoreAllMocks();
});

describe("CommandWindow", () => {
  it("sends only to the chosen Lootlog and closes", async () => {
    useChatStore.getState().setCommandGuildId("guild-2");
    mount();
    const user = await type("hello");
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(useWindowsStore.getState().command.open).toBe(false),
    );
    expect(
      chatRequest.mock.calls.map(([request]) => requestPath(request)),
    ).toEqual(["/guilds/guild-2/chat-messages"]);
    expect(getDraft()).toBe("");
  });
  it("does not attach or clear the chat's pending reply", async () => {
    const reply = {
      guildId: "guild-1",
      messageId: "message-0",
      senderNick: "Raider",
      message: "boss?",
      type: "NORMAL",
    } as const;

    useChatStore.getState().setReplyDraft(reply);
    mount();
    const user = await type("hello");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(chatRequest).toHaveBeenCalledOnce());
    const body = JSON.parse(String(chatRequest.mock.calls[0]?.[1]?.body));
    expect(body).not.toHaveProperty("replyTo");
    expect(useChatStore.getState().replyDraftsByGuild["guild-1"]).toEqual(
      reply,
    );
  });
  it("ignores repeated submits and closes after a successful notification", async () => {
    const deferred = Promise.withResolvers<Response>();
    notificationRequest.mockReturnValue(deferred.promise);
    mount();
    await type("!alarm");
    const editor = getEditor();
    fireEvent.keyDown(editor, { key: "Enter" });
    fireEvent.keyDown(editor, { key: "Enter" });
    await waitFor(() => expect(notificationRequest).toHaveBeenCalledOnce());
    expect(editor).toHaveAttribute("tabindex", "-1");
    act(() =>
      deferred.resolve(
        Response.json({
          guildIds: ["guild-1"],
          notificationId: "notification-1",
        }),
      ),
    );
    await waitFor(() =>
      expect(useWindowsStore.getState().command.open).toBe(false),
    );
    expect(chatRequest).toHaveBeenCalledOnce();
    expect(getDraft()).toBe("");
  });
  it("keeps the console and the notification draft after an error", async () => {
    notificationRequest.mockResolvedValue(
      Response.json({ message: "unavailable" }, { status: 503 }),
    );
    mount();
    const user = await type("!alarm");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(getDraft()).toBe("!alarm");
    expect(useWindowsStore.getState().command.open).toBe(true);
    expect(chatRequest).not.toHaveBeenCalled();
  });
  it("shows only the translated rate-limit error for a 429 response", async () => {
    notificationRequest.mockResolvedValue(
      Response.json({ retryAfterMs: 1000 }, { status: 429 }),
    );
    mount();
    const user = await type("!alarm");
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Wysyłasz zbyt szybko. Spróbuj ponownie za chwilę.",
      ),
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(getDraft()).toBe("!alarm");
  });
  it("keeps the draft after a stray click outside but drops it on Escape", async () => {
    mount();
    await type("boss na 2");
    fireEvent.pointerDown(document.body);
    expect(useWindowsStore.getState().command.open).toBe(false);
    expect(getDraft()).toBe("boss na 2");
    act(() => useWindowsStore.getState().setOpen("command", true));
    const user = userEvent.setup();
    await user.click(getEditor());
    await user.keyboard("{Escape}");
    expect(useWindowsStore.getState().command.open).toBe(false);
    expect(getDraft()).toBe("");
    expect(chatRequest).not.toHaveBeenCalled();
  });
});
