import { type toast as SonnerToast, toast } from "sonner";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { configureApiClients } from "@lootlog/client/transport";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@lootlog/client/main";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowsStore } from "@/store/windows.store";
import { useChatStore } from "@/store/chat.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
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

const submit = (message: string) => {
  const textarea = screen.getByPlaceholderText("Wiadomość...");
  fireEvent.change(textarea, { target: { value: message } });
  const form = textarea.closest("form");

  if (!form) throw new Error("Expected command form");
  fireEvent.submit(form);

  return { textarea, form };
};

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
  useChatStore.setState({ selectedInputGuildIds: ["guild-1"] });
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
    [],
  );
  chatRequest.mockReset().mockResolvedValue(Response.json([]));
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
  it("ignores repeated submits and unlocks after a successful notification", async () => {
    const deferred = Promise.withResolvers<Response>();
    notificationRequest.mockReturnValue(deferred.promise);
    mount();
    const { textarea, form } = submit("!alarm");
    fireEvent.submit(form);
    await waitFor(() => expect(notificationRequest).toHaveBeenCalledOnce());
    await waitFor(() => expect(textarea).toBeDisabled());
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
    expect(textarea).toHaveValue("");
  });
  it("unlocks and preserves the notification message after an error", async () => {
    const deferred = Promise.withResolvers<Response>();
    notificationRequest.mockReturnValue(deferred.promise);
    mount();
    const { textarea } = submit("!alarm");
    await waitFor(() => expect(textarea).toBeDisabled());
    act(() =>
      deferred.resolve(
        Response.json({ message: "unavailable" }, { status: 503 }),
      ),
    );
    await waitFor(() => expect(textarea).not.toBeDisabled());
    expect(textarea).toHaveValue("!alarm");
    expect(useWindowsStore.getState().command.open).toBe(true);
    expect(chatRequest).not.toHaveBeenCalled();
  });
  it("unlocks an ordinary message after its own request", async () => {
    const deferred = Promise.withResolvers<Response>();
    chatRequest.mockReturnValue(deferred.promise);
    mount();
    const { textarea } = submit("hello");
    await waitFor(() => expect(textarea).toBeDisabled());
    expect(notificationRequest).not.toHaveBeenCalled();
    act(() => deferred.resolve(Response.json([])));
    await waitFor(() =>
      expect(useWindowsStore.getState().command.open).toBe(false),
    );
  });
  it("shows only the translated rate-limit error for a 429 response", async () => {
    notificationRequest.mockResolvedValue(
      Response.json({ retryAfterMs: 1000 }, { status: 429 }),
    );
    mount();
    const { textarea } = submit("!alarm");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Wysyłasz zbyt szybko. Spróbuj ponownie za chwilę.",
      ),
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue("!alarm");
  });
});
