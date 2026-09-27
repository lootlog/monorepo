// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  getMembersControllerGetGuildMembersQueryKey,
  getMembersControllerGetLatestRefreshJobQueryKey,
} from "@lootlog/client/main";
import { createTestGateway } from "@/lib/testing/gateway";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { RefreshStatusProvider } from "../contexts/refresh-status-provider";
import "@/i18n/config";
import { RefreshMembersButton } from "./refresh-members-button";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const job = (status: string, processedMembers: number) => ({
  id: 7,
  guildId: "guild-1",
  status,
  totalMembers: 10,
  processedMembers,
  failedMembers: 0,
  createdAt: new Date().toISOString(),
  nextAvailableAt: new Date(Date.now() + 60 * 60_000).toISOString(),
});

it("replaces progress missed during a disconnect with the job state after rejoin", async () => {
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input) => {
          const { pathname } = new URL(
            input instanceof Request ? input.url : input.toString(),
          );

          return pathname === "/guilds/guild-alias/members/refresh-jobs/latest"
            ? Response.json(job("COMPLETED", 10))
            : new Response(null, { status: 404 });
        },
      },
    }),
  );

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  client.setQueryData(
    getGuildsControllerGetGuildByIdQueryKey({ guildId: "guild-alias" }),
    { id: "guild-1" },
  );
  client.setQueryData(
    getMembersControllerGetLatestRefreshJobQueryKey({ guildId: "guild-alias" }),
    job("PROCESSING", 1),
  );

  const membersKey = getMembersControllerGetGuildMembersQueryKey({
    guildId: "guild-alias",
  });

  client.setQueryData(membersKey, []);

  const gateway = createTestGateway();
  const Router = await createOrganizationTestWrapper("/guild-alias");

  render(
    <Router>
      <gateway.wrapper>
        <QueryClientProvider client={client}>
          <RefreshStatusProvider>
            <RefreshMembersButton />
          </RefreshStatusProvider>
        </QueryClientProvider>
      </gateway.wrapper>
    </Router>,
  );

  act(() =>
    gateway.deliver({
      v: 1,
      type: "member-refresh.updated",
      data: {
        organizationId: "guild-1",
        payload: {
          guildId: "guild-1",
          jobId: 7,
          status: "PROCESSING",
          totalMembers: 10,
          processedMembers: 4,
          failedMembers: 0,
        },
      },
    }),
  );
  expect(screen.getByRole("progressbar")).toBeTruthy();

  // The completion event was published while the socket was closed.
  act(() =>
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "connection-2",
        organizationIds: ["guild-1"],
        subscriptionScopes: [],
      },
    }),
  );

  await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
  // Missed per-member results can change Discord sync diagnostics.
  expect(client.getQueryState(membersKey)?.isInvalidated).toBe(true);
});
