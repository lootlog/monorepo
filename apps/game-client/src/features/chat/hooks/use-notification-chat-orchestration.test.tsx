import { act, renderHook, waitFor } from "@testing-library/react";
import { ApiError } from "@lootlog/api-client/transport";
import {
  isNotificationRateLimitError,
  useNotificationChatOrchestration,
} from "./use-notification-chat-orchestration";

const createNotification = vi.fn();

vi.mock("@lootlog/api-client/react-query/main/messaging", () => ({
  useMessagingControllerSendNotification: () => ({
    mutateAsync: createNotification,
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

describe("useNotificationChatOrchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stays pending until notification creation and chat publishing finish", async () => {
    const notificationDeferred = createDeferred<{
      guildIds: string[];
      notificationId: string;
    }>();
    const chatDeferred = createDeferred<string>();
    const sendChatMessage = vi.fn(() => chatDeferred.promise);
    createNotification.mockReturnValue(notificationDeferred.promise);
    const { result } = renderHook(() => useNotificationChatOrchestration());

    let operation: Promise<unknown> | undefined;
    act(() => {
      operation = result.current.startNotificationMessage({
        guildIds: ["guild-1"],
        world: "tempest",
        message: "alarm",
        sendChatMessage,
      });
    });
    expect(result.current.isCreatingNotificationMessage).toBe(true);

    act(() => {
      notificationDeferred.resolve({
        guildIds: ["guild-1"],
        notificationId: "notification-1",
      });
    });
    await waitFor(() => expect(sendChatMessage).toHaveBeenCalled());
    expect(result.current.isCreatingNotificationMessage).toBe(true);

    await act(async () => {
      chatDeferred.resolve("sent");
      if (!operation) {
        throw new Error("Expected notification operation");
      }
      await operation;
    });
    expect(result.current.isCreatingNotificationMessage).toBe(false);
  });

  it("unlocks after notification creation fails", async () => {
    createNotification.mockRejectedValue(new Error("unavailable"));
    const { result } = renderHook(() => useNotificationChatOrchestration());

    await act(async () => {
      await expect(
        result.current.startNotificationMessage({
          guildIds: ["guild-1"],
          world: "tempest",
          message: "alarm",
          sendChatMessage: vi.fn(),
        }),
      ).rejects.toThrow("unavailable");
    });

    expect(result.current.isCreatingNotificationMessage).toBe(false);
  });

  it("recognizes only API rate-limit errors", () => {
    const rateLimitError = new ApiError({
      status: 429,
      data: { retryAfterMs: 1_000 },
      url: "/messaging",
      method: "POST",
      message: "Request failed",
    });

    expect(isNotificationRateLimitError(rateLimitError)).toBe(true);
    expect(isNotificationRateLimitError(new Error("failed"))).toBe(false);
  });
});
