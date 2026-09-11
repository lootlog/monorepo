import { toast } from "sonner";
import { useWindowsStore } from "@/store/windows.store";
import userEvent from "@testing-library/user-event";
import { ChatQuickActionStrip } from "../components/chat-quick-action-strip";
import { useHotkeysStore } from "@/store/hotkeys.store";
import {
  act,
  render,
  screen,
  waitFor,
  renderHook,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
} from "@lootlog/client/main";
import type { ReactNode } from "react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { useChatQuickActions } from "./use-chat-quick-actions";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useChatStore } from "@/store/chat.store";

const request = vi.fn<typeof fetch>();

let queryClient: QueryClient;

let restoreApi: () => void;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.spyOn(toast, "error").mockImplementation(() => "error");
  vi.spyOn(toast, "warning").mockImplementation(() => "warning");
  setTestRuntimeGame();
  useChatStore.setState(useChatStore.getInitialState(), true);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [{ id: "a", name: "Organization A", icon: null, vanityUrl: null }],
  );
  queryClient.setQueryData(getUsersControllerGetUserPreferencesQueryKey(), {
    guildsOrder: [],
    hiddenGuildIds: [],
  });
  useHotkeysStore.getState().resetAll();
  request.mockReset();
  restoreApi = configureApiClients({
    main: { baseUrl: "https://api.example.test", fetch: request },
  });
});

afterEach(() => {
  restoreApi();
  queryClient.clear();
  vi.restoreAllMocks();
});

it("does not send when no organization is selected at the top", async () => {
  const { result } = renderHook(useChatQuickActions, { wrapper });
  await act(() => result.current.sendHelp());
  expect(request).not.toHaveBeenCalled();
});

it("reads the current top selection at invocation even with no composer mounted", async () => {
  const { result } = renderHook(useChatQuickActions, { wrapper });
  useChatStore.getState().setSelectedChatGuildId("all");
  await act(() => result.current.sendHelp());
  expect(request).not.toHaveBeenCalled();
  useChatStore.getState().setSelectedChatGuildId("a");
  request
    .mockResolvedValueOnce(
      Response.json({ guildIds: ["a"], notificationId: "sent" }),
    )
    .mockRejectedValueOnce(new Error("chat offline"));
  await act(() => result.current.sendHelp());
  expect(request.mock.calls[0]?.[1]?.body).toContain('"guildIds":["a"]');
});

it("handles partial alarm delivery without retrying or changing a draft", async () => {
  useChatStore.getState().setSelectedChatGuildId("a");
  useChatStore.getState().setDraft("a", "unfinished conversation");
  request
    .mockResolvedValueOnce(
      Response.json({ guildIds: ["a"], notificationId: "sent" }),
    )
    .mockRejectedValueOnce(new Error("chat offline"));
  const { result } = renderHook(useChatQuickActions, { wrapper });
  await act(() => result.current.sendHelp());
  expect(toast.warning).toHaveBeenCalledWith(
    expect.stringContaining("Nie wysyłaj ponownie"),
  );
  expect(request).toHaveBeenCalledTimes(2);
  expect(useChatStore.getState().draftsByGuild.a).toBe(
    "unfinished conversation",
  );
});

it("ignores overlapping alarm presses while the notification is being delivered", async () => {
  useChatStore.getState().setSelectedChatGuildId("a");
  const pending = Promise.withResolvers<Response>();
  request
    .mockReturnValueOnce(pending.promise)
    .mockRejectedValueOnce(new Error("chat offline"));
  const { result } = renderHook(useChatQuickActions, { wrapper });
  await act(async () => {
    const first = result.current.sendHelp();
    await result.current.sendHelp();
    pending.resolve(Response.json({ guildIds: ["a"], notificationId: "sent" }));
    await first;
  });
  expect(request).toHaveBeenCalledTimes(2);
});

it("sends Position immediately to the selected organization without changing a full draft", async () => {
  useChatStore.getState().setSelectedChatGuildId("a");
  useChatStore.getState().setDraft("a", "x".repeat(128));
  request.mockResolvedValueOnce(
    Response.json({
      id: "position",
      guildId: "a",
      message: "Tester(230w), Ithan (1, 2)",
      type: "NORMAL",
      timestamp: new Date().toISOString(),
    }),
  );
  const { result } = renderHook(useChatQuickActions, { wrapper });
  await act(() => result.current.sendPosition());
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]?.[1]?.body).toContain(
    '"message":"Tester(230w), Ithan (1, 2)"',
  );
  expect(String(request.mock.calls[0]?.[0])).toContain("a");
  expect(useChatStore.getState().draftsByGuild.a).toBe("x".repeat(128));
});

it("opens quick actions with current shortcuts and sends position without changing the draft", async () => {
  const user = userEvent.setup();
  useHotkeysStore.getState().setBinding("chat-position", {
    type: "keyboard",
    key: "P",
    ctrl: true,
    shift: false,
    alt: true,
  });
  useChatStore.getState().setDraft("a", "Keep this draft");
  request.mockResolvedValueOnce(
    Response.json({
      id: "position",
      guildId: "a",
      message: "Position",
      type: "NORMAL",
      timestamp: new Date().toISOString(),
    }),
  );
  render(<ChatQuickActionStrip guildId="a" />, { wrapper });
  const trigger = screen.getByRole("button", { name: "Szybkie akcje" });
  expect(
    screen.queryByRole("button", { name: "Pozycja" }),
  ).not.toBeInTheDocument();
  await user.click(trigger);
  expect(
    screen.getByText(
      (content, element) =>
        element?.getAttribute("data-slot") === "kbd-group" &&
        element.textContent === "Ctrl + Alt + P",
    ),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Pozycja" }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(useChatStore.getState().draftsByGuild.a).toBe("Keep this draft");
  await user.click(trigger);
  await user.keyboard("{Escape}");
  await waitFor(() => expect(trigger).toHaveFocus());
});

it("creates a gathering in the current chat organization instead of the command window selection", async () => {
  const user = userEvent.setup();
  useChatStore.getState().setSelectedInputGuildIds(["b"]);
  useChatStore.getState().setDraft("a", "Keep draft");
  useWindowsStore.getState().setOpen("create-party-gathering", false);
  request.mockRejectedValueOnce(new Error("offline"));
  render(<ChatQuickActionStrip guildId="a" />, { wrapper });
  await user.click(screen.getByRole("button", { name: "Szybkie akcje" }));
  expect(
    screen.queryByRole("button", { name: "Ustawienia" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Party finder" }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
  expect(body.guildIds).toEqual(["a"]);
  expect(body).not.toHaveProperty("description");
  expect(body).not.toHaveProperty("npc");
  expect(body).not.toHaveProperty("minLvl");
  expect(body).not.toHaveProperty("maxLvl");
  expect(useWindowsStore.getState()["create-party-gathering"].open).toBe(false);
  expect(useChatStore.getState().draftsByGuild.a).toBe("Keep draft");
});

it("disables gathering creation without a chat organization even when commands have a selection", async () => {
  const user = userEvent.setup();
  useChatStore.getState().setSelectedInputGuildIds(["b"]);
  render(<ChatQuickActionStrip />, { wrapper });
  await user.click(screen.getByRole("button", { name: "Szybkie akcje" }));
  const create = screen.getByRole("button", { name: "Party finder" });
  expect(create).toBeDisabled();
  await user.click(create);
  expect(request).not.toHaveBeenCalled();
});

it("reports failed position delivery without retrying", async () => {
  useChatStore.getState().setSelectedChatGuildId("a");
  request.mockRejectedValue(new Error("offline"));
  const { result } = renderHook(useChatQuickActions, { wrapper });
  await act(() => result.current.sendPosition());
  expect(request).toHaveBeenCalledTimes(1);
  expect(toast.error).toHaveBeenCalledWith(
    "Nie udało się wysłać wiadomości na czat",
  );
});
