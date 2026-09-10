// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  getMembersControllerGetGuildMembersQueryKey,
} from "@lootlog/client/main";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { createTestGateway } from "@/lib/testing/gateway";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { useRefreshStatus } from "./refresh-status-context";
import { RefreshStatusProvider } from "./refresh-status-provider";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("resolves the vanity route for refresh events and invalidates its member list only", async () => {
  const gateway = createTestGateway();
  const GatewayWrapper = gateway.wrapper;
  const RouterWrapper = await createOrganizationTestWrapper("/our-vanity");

  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });

  client.setQueryData(
    getGuildsControllerGetGuildByIdQueryKey({ guildId: "our-vanity" }),
    { id: "canonical-id" },
  );

  const membersKey = getMembersControllerGetGuildMembersQueryKey(
    { guildId: "our-vanity" },
    { includeInactive: true },
  );

  const otherKey = getMembersControllerGetGuildMembersQueryKey(
    { guildId: "other-id" },
    { includeInactive: true },
  );

  client.setQueryData(membersKey, []);
  client.setQueryData(otherKey, []);

  const { result, unmount } = renderHook(useRefreshStatus, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <RouterWrapper>
        <GatewayWrapper>
          <QueryClientProvider client={client}>
            <RefreshStatusProvider>{children}</RefreshStatusProvider>
          </QueryClientProvider>
        </GatewayWrapper>
      </RouterWrapper>
    ),
  });

  const emit = (guildId: string) =>
    act(() => {
      gateway.deliver({
        v: 1,
        type: "member-refresh.updated",
        data: {
          organizationId: guildId,
          payload: {
            guildId,
            jobId: 1,
            status: "COMPLETED",
            totalMembers: 2,
            processedMembers: 2,
            failedMembers: 1,
            refreshedIds: ["refreshed"],
            failedIds: ["failed"],
          },
        },
      });
    });

  emit("other-id");
  expect(result.current.refreshedIds.size).toBe(0);
  expect(result.current.failedIds.size).toBe(0);
  expect(client.getQueryState(membersKey)?.isInvalidated).toBe(false);
  emit("canonical-id");
  expect([...result.current.refreshedIds]).toEqual(["refreshed"]);
  expect([...result.current.failedIds]).toEqual(["failed"]);
  expect(client.getQueryState(membersKey)?.isInvalidated).toBe(true);
  expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
  unmount();
  client.clear();
});
