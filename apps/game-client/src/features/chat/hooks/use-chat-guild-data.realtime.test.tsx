import { ownerAccessPolicy } from "@/test/realtime-wire";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSocket } from "@/contexts/socket-context";
import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { createRealtimeTest } from "@/test/realtime-test";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useChatGuildData } from "./use-chat-guild-data";

describe("useChatGuildData with the realtime session", () => {
  it.each(["invalid", "refused"] as const)(
    "loads HTTP snapshots and recovers when the first join is %s",
    async (failure) => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const test = createRealtimeTest();
      setTestRuntimeGame({ hero: { accountId: "20", characterId: "10" } });

      const { result, unmount } = renderHook(
        () => ({
          status: useSocket().status,
          chat: useChatGuildData({
            currentCharacterNick: "Hero",
            guilds: [{ id: "guild-1", name: "Guild" }],
            selectedGuildId: "guild-1",
          }),
        }),
        { wrapper: test.wrapper },
      );

      const joinRequests = () =>
        test.wire.frames.filter(
          (frame) => "type" in frame && frame.type === "session.join",
        );

      const answerJoin = async (
        answer: "invalid" | "refused" | "success",
        previousRequests: number,
      ) => {
        await vi.waitFor(() => {
          if (joinRequests().length <= previousRequests)
            throw new Error("Waiting for join request");
        });
        const request = joinRequests().at(-1);

        if (!request || !("requestId" in request) || !request.requestId)
          throw new Error("Expected join request");
        const requestId = request.requestId;

        await act(() =>
          test.wire.receive(
            answer === "refused"
              ? {
                  v: 1,
                  requestId,
                  status: "error",
                  error: {
                    code: "SUBSCRIPTION_LIMIT_EXCEEDED",
                    message: "Subscription limit exceeded",
                    retryable: false,
                  },
                }
              : {
                  v: 1,
                  requestId,
                  status: "success",
                  data:
                    answer === "success"
                      ? {
                          connectionId: "connection-1",
                          organizationIds: [],
                          subscriptionScopes: [],
                          accessPolicy: ownerAccessPolicy([]),
                        }
                      : {},
                },
          ),
        );
      };

      try {
        test.open();
        act(() =>
          useGlobalStore.setState({ gameState: { gameInitialized: true } }),
        );
        expect(result.current.status).toBe("connecting");
        expect(test.chatHistoryRequest).not.toHaveBeenCalled();

        await answerJoin(failure, 0);
        await waitFor(() => expect(result.current.status).toBe("unreachable"));
        await waitFor(() =>
          expect(test.chatHistoryRequest).toHaveBeenCalledTimes(1),
        );

        const failedRequests = joinRequests().length;

        if (failure === "refused")
          act(() => {
            getSocket().connect();
            test.open();
          });
        else {
          await act(() => vi.advanceTimersByTimeAsync(2_000));
          test.open();
        }

        await answerJoin("success", failedRequests);
        await waitFor(() => expect(result.current.status).toBe("online"));
        expect(joinRequests()).toHaveLength(failedRequests + 1);
      } finally {
        unmount();
        vi.useRealTimers();
      }
    },
  );
});
