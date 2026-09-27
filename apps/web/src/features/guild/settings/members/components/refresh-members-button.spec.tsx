// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

const latestJobKey = getMembersControllerGetLatestRefreshJobQueryKey({
  guildId: "guild-alias",
});

const job = (id: number, status: string, processedMembers: number) => ({
  id,
  guildId: "guild-1",
  status,
  totalMembers: 10,
  processedMembers,
  failedMembers: 0,
  createdAt: new Date().toISOString(),
  nextAvailableAt: new Date(Date.now() + 60 * 60_000).toISOString(),
});

const progress = (jobId: number, status: string, processedMembers: number) =>
  ({
    v: 1,
    type: "member-refresh.updated",
    data: {
      organizationId: "guild-1",
      payload: {
        guildId: "guild-1",
        jobId,
        status,
        totalMembers: 10,
        processedMembers,
        failedMembers: 0,
      },
    },
  }) as const;

async function setup(routes: Record<string, () => Promise<Response>>) {
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input) => {
          const { pathname } = new URL(
            input instanceof Request ? input.url : input.toString(),
          );

          return routes[pathname]?.() ?? new Response(null, { status: 404 });
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

  const gateway = createTestGateway();
  const Router = await createOrganizationTestWrapper("/guild-alias");

  const renderButton = () =>
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

  return { client, gateway, renderButton };
}

it("replaces progress missed during a disconnect with the job state after rejoin", async () => {
  const { client, gateway, renderButton } = await setup({
    [latestJobKey[0]]: async () => Response.json(job(7, "COMPLETED", 10)),
  });

  client.setQueryData(latestJobKey, job(7, "PROCESSING", 1));

  const membersKey = getMembersControllerGetGuildMembersQueryKey({
    guildId: "guild-alias",
  });

  client.setQueryData(membersKey, []);
  renderButton();

  await act(async () => gateway.deliver(progress(7, "PROCESSING", 4)));
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

it("keeps a completion that arrives before the start response across remounts", async () => {
  const resolveStart = vi.fn<(response: Response) => void>();

  const { client, gateway, renderButton } = await setup({
    [latestJobKey[0]]: async () => Response.json(job(8, "COMPLETED", 10)),
    "/guilds/guild-alias/members/refresh-all": () =>
      new Promise((resolve) => resolveStart.mockImplementation(resolve)),
  });

  client.setQueryData(latestJobKey, {
    ...job(7, "COMPLETED", 10),
    nextAvailableAt: new Date(0).toISOString(),
  });

  const view = renderButton();
  fireEvent.click(screen.getByRole("button"));

  // A small job finishes before the POST response reaches the page.
  await act(async () => gateway.deliver(progress(8, "COMPLETED", 10)));
  await waitFor(() =>
    expect(client.getQueryData(latestJobKey)).toMatchObject({ id: 8 }),
  );
  await act(async () => resolveStart(Response.json(job(8, "PENDING", 0))));

  view.unmount();
  renderButton();
  expect(client.getQueryData(latestJobKey)).toMatchObject({
    status: "COMPLETED",
  });
  expect(screen.queryByRole("progressbar")).toBeNull();
});
