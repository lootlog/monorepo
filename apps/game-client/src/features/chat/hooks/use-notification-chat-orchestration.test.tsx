import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiError, configureApiClients } from "@lootlog/client/transport";
import {
  isNotificationRateLimitError,
  useNotificationChatOrchestration,
} from "./use-notification-chat-orchestration";

const fetchRequest = vi.fn<typeof fetch>();
let queryClient: QueryClient;
let restoreApi: () => void;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
afterEach(() => {
  restoreApi();
  queryClient.clear();
});

describe("useNotificationChatOrchestration", () => {
  beforeEach(() => {
    fetchRequest.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    restoreApi = configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
        fetch: fetchRequest,
      },
    });
  });

  it("stays pending until notification creation and chat publishing finish", async () => {
    const notificationDeferred = Promise.withResolvers<{
      guildIds: string[];
      notificationId: string;
    }>();
    const chatDeferred = Promise.withResolvers<string>();
    const sendChatMessage = vi.fn<(guildIds: string[]) => Promise<string>>(
      () => chatDeferred.promise,
    );
    fetchRequest.mockReturnValue(
      notificationDeferred.promise.then((body) => Response.json(body)),
    );
    const { result } = renderHook(() => useNotificationChatOrchestration(), {
      wrapper,
    });

    let operation:
      | ReturnType<typeof result.current.startNotificationMessage<string>>
      | undefined;
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
    fetchRequest.mockRejectedValue(new Error("unavailable"));
    const { result } = renderHook(() => useNotificationChatOrchestration(), {
      wrapper,
    });

    await act(async () => {
      await expect(
        result.current.startNotificationMessage({
          guildIds: ["guild-1"],
          world: "tempest",
          message: "alarm",
          sendChatMessage: vi.fn<(guildIds: string[]) => Promise<string>>(),
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
