// @vitest-environment happy-dom
import { useRef } from "react";
import {
  getMembersControllerGetGuildMembersQueryKey,
  useMembersControllerGetGuildMembers,
  type MemberResponseDto,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { loadAuthenticatedTranslations } from "@/i18n/config";
import { MemberDeactivationButton } from "./components/member-deactivation-button";
import { MembersTable } from "./members-table";

await loadAuthenticatedTranslations();

const members: MemberResponseDto[] = ["Alice", "Bob", "Carol"].map(
  (name, index) => ({
    id: index + 1,
    userId: `user-${index + 1}`,
    guildId: "guild-1",
    type: "USER",
    name,
    active: true,
    roles: [],
    updatedAt: "2026-09-20T00:00:00Z",
  }),
);

function MemberList({ table }: { table: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);

  const { data = [] } = useMembersControllerGetGuildMembers({
    guildId: "guild-1",
  });

  return (
    <div ref={viewport}>
      {table ? (
        <MembersTable
          members={data}
          guildOwnerId="owner"
          activityStatsByDiscordIdAndSource={new Map()}
          scrollElementRef={viewport}
          isMobile={false}
          canManageMembers
          memberGamePresenceByDiscordId={undefined}
          memberWebPresenceByDiscordId={undefined}
          guildId="guild-1"
        />
      ) : (
        data[0] && (
          <MemberDeactivationButton
            member={data[0]}
            onDeactivated={() => undefined}
          />
        )
      )}
    </div>
  );
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(480);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(1200);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function mount(table: boolean) {
  const requests: string[] = [];

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  onTestFinished(() => client.clear());
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input, init) => {
          if (init?.method === "PATCH") {
            requests.push(String(input));

            return Response.json({ ...members[1], active: false });
          }

          return Response.json(members);
        },
      },
    }),
  );

  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "$guildId/settings/members",
    component: () => <MemberList table={table} />,
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({
      initialEntries: ["/guild-1/settings/members"],
    }),
  });

  await router.load();
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  const replaceMembers = async (next: MemberResponseDto[]) => {
    await act(async () => {
      client.setQueryData(
        getMembersControllerGetGuildMembersQueryKey({ guildId: "guild-1" }),
        next,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  return { requests, replaceMembers };
}

it("keeps a deactivation confirmation attached to its member after preceding rows disappear", async () => {
  const { requests, replaceMembers } = await mount(true);
  const row = (await screen.findByText("Bob")).closest("tr");

  if (!row) throw new Error("Member must have a table row");
  fireEvent.click(within(row).getByRole("button"));
  fireEvent.click(await screen.findByRole("button", { name: "Dezaktywuj" }));
  await screen.findByRole("alertdialog");

  await replaceMembers(members.slice(1));

  const dialog = screen.getByRole("alertdialog");
  expect(within(dialog).getByRole("heading").textContent).toContain("Bob");
  fireEvent.click(within(dialog).getByRole("button", { name: "Dezaktywuj" }));

  await waitFor(() =>
    expect(requests).toEqual([
      "https://api.test/guilds/guild-1/members/user-2/deactivate",
    ]),
  );
});

it("submits the member named when the confirmation opened even if its props change", async () => {
  const { requests, replaceMembers } = await mount(false);
  fireEvent.click(await screen.findByRole("button", { name: "Dezaktywuj" }));
  await screen.findByRole("alertdialog");

  await replaceMembers(members.slice(1));

  const dialog = screen.getByRole("alertdialog");
  expect(within(dialog).getByRole("heading").textContent).toContain("Alice");
  fireEvent.click(within(dialog).getByRole("button", { name: "Dezaktywuj" }));

  await waitFor(() =>
    expect(requests).toEqual([
      "https://api.test/guilds/guild-1/members/user-1/deactivate",
    ]),
  );
});

it("returns keyboard focus to the same member after canceling on a refreshed list", async () => {
  const { replaceMembers } = await mount(true);
  const row = (await screen.findByText("Bob")).closest("tr");

  if (!row) throw new Error("Member must have a table row");

  const actions = within(row).getByRole("button");
  actions.focus();
  fireEvent.click(actions);
  const deactivate = await screen.findByRole("button", { name: "Dezaktywuj" });
  deactivate.focus();
  fireEvent.click(deactivate);
  await screen.findByRole("alertdialog");

  await replaceMembers(members.slice(1));

  const cancel = within(screen.getByRole("alertdialog")).getByRole("button", {
    name: "Anuluj",
  });

  cancel.focus();
  fireEvent.keyDown(cancel, { key: "Escape" });

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  const refreshedRow = screen.getByText("Bob").closest("tr");

  if (!refreshedRow) throw new Error("Member must remain in the table");

  await waitFor(() => expect(document.activeElement).toBe(refreshedRow));
});
