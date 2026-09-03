import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ApiError } from "@lootlog/client/transport";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { CommandWindow } from "./command";

const mocks = vi.hoisted(() => ({
  handlePartyCommand: vi.fn(),
  sendChatMessage: vi.fn(),
  setOpen: vi.fn(),
  startNotificationMessage: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/components/draggable-window", () => ({
  DraggableWindow: ({
    children,
    isOpen,
  }: {
    children: ReactNode;
    isOpen: boolean;
  }) => (isOpen ? children : null),
}));

vi.mock("@/components/guild-multi-selector", () => ({
  GuildMultiSelector: () => null,
}));

vi.mock("./components/command-actions", () => ({
  CommandActions: () => null,
}));

vi.mock("./components/command-suggestions", () => ({
  CommandSuggestions: () => null,
  useCommandSuggestions: () => ({
    filtered: [],
    handleKeyDown: () => false,
    isOpen: false,
    selectedIndex: 0,
  }),
}));

vi.mock("@/features/command/hooks/use-party-command", () => ({
  usePartyCommand: () => ({ handlePartyCommand: mocks.handlePartyCommand }),
}));

vi.mock("@/hooks/api/use-send-chat-message", () => ({
  useSendChatMessage: () => ({ mutateAsync: mocks.sendChatMessage }),
}));

vi.mock("@/features/chat/hooks/use-notification-chat-orchestration", () => ({
  isNotificationRateLimitError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 429,
  useNotificationChatOrchestration: () => ({
    startNotificationMessage: mocks.startNotificationMessage,
  }),
}));

vi.mock("@/store/chat.store", () => ({
  useChatStore: (
    selector: (state: {
      selectedInputGuildIds: string[];
      setSelectedInputGuildIds: () => void;
    }) => unknown,
  ) =>
    selector({
      selectedInputGuildIds: ["guild-1"],
      setSelectedInputGuildIds: vi.fn(),
    }),
}));

vi.mock("@/store/game.store", () => ({
  useGameStore: (selector: (state: unknown) => unknown) =>
    selector({
      game: {
        hero: {
          accountId: "456",
          characterId: "123",
          icon: "hero.gif",
          level: 200,
          name: "Hero",
          profession: "w",
        },
        world: "tempest",
      },
    }),
}));

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (
    selector: (state: {
      command: { autofocus: boolean; open: boolean };
      setOpen: typeof mocks.setOpen;
    }) => unknown,
  ) =>
    selector({
      command: { autofocus: false, open: true },
      setOpen: mocks.setOpen,
    }),
}));

const createDeferred = <T,>() => {
  let resolve: (value: T) => void = () => {
    throw new Error("Deferred promise was not initialized");
  };
  let reject: (reason?: unknown) => void = () => {
    throw new Error("Deferred promise was not initialized");
  };
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};

describe("CommandWindow", () => {
  const getTextarea = () => screen.getByPlaceholderText("Wiadomość...");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores repeated submits and unlocks after a successful notification", async () => {
    const deferred = createDeferred<unknown>();
    mocks.startNotificationMessage.mockReturnValue(deferred.promise);
    render(<CommandWindow />);
    const textarea = getTextarea();
    fireEvent.change(textarea, { target: { value: "!alarm" } });
    const form = textarea.closest("form");

    if (!form) {
      throw new Error("Expected command form");
    }
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() =>
      expect(mocks.startNotificationMessage).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(textarea).toBeDisabled());

    act(() => deferred.resolve({}));

    await waitFor(() => expect(textarea).not.toBeDisabled());
    expect(textarea).toHaveValue("");
    expect(mocks.setOpen).toHaveBeenCalledWith("command", false);
  });

  it("unlocks and preserves the notification message after an error", async () => {
    const deferred = createDeferred<unknown>();
    mocks.startNotificationMessage.mockReturnValue(deferred.promise);
    render(<CommandWindow />);
    const textarea = getTextarea();
    fireEvent.change(textarea, { target: { value: "!alarm" } });
    const form = textarea.closest("form");
    if (!form) {
      throw new Error("Expected command form");
    }
    fireEvent.submit(form);

    await waitFor(() => expect(textarea).toBeDisabled());
    act(() => deferred.reject(new Error("unavailable")));

    await waitFor(() => expect(textarea).not.toBeDisabled());
    expect(textarea).toHaveValue("!alarm");
    expect(mocks.setOpen).not.toHaveBeenCalledWith("command", false);
  });

  it("unlocks an ordinary message after its own request", async () => {
    const deferred = createDeferred<unknown>();
    mocks.sendChatMessage.mockReturnValue(deferred.promise);
    render(<CommandWindow />);
    const textarea = getTextarea();
    fireEvent.change(textarea, { target: { value: "hello" } });
    const form = textarea.closest("form");
    if (!form) {
      throw new Error("Expected command form");
    }
    fireEvent.submit(form);

    await waitFor(() => expect(textarea).toBeDisabled());
    expect(mocks.startNotificationMessage).not.toHaveBeenCalled();
    act(() => deferred.resolve({}));

    await waitFor(() => expect(textarea).not.toBeDisabled());
  });

  it("shows only the translated rate-limit error for a 429 response", async () => {
    mocks.startNotificationMessage.mockRejectedValue(
      new ApiError({
        status: 429,
        data: { retryAfterMs: 1_000 },
        url: "/messaging",
        method: "POST",
        message: "Request failed",
      }),
    );
    render(<CommandWindow />);
    const textarea = getTextarea();
    fireEvent.change(textarea, { target: { value: "!alarm" } });
    const form = textarea.closest("form");
    if (!form) {
      throw new Error("Expected command form");
    }
    fireEvent.submit(form);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Wysyłasz powiadomienia zbyt szybko. Spróbuj ponownie za chwilę.",
      ),
    );
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue("!alarm");
  });
});
