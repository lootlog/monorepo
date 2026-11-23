// @vitest-environment happy-dom
import { act, fireEvent, screen } from "@testing-library/react";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import { expect, it, vi } from "vitest";
import { createTestAccessPolicy } from "@/lib/testing/gateway";
import {
  listState,
  loot,
  lootPage,
  mount,
  snapshot,
} from "./use-live-loot-list.fixtures";

it("drops a waiting snapshot when loot access is restricted", async () => {
  let page = [loot];

  const { gateway } = await mount(
    async () => Response.json(lootPage(page)),
    undefined,
    "",
  );

  const viewport = screen.getByTestId("loot-scroll");

  const joined = (levelTo: number) =>
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "connection",
        organizationIds: ["one"],
        subscriptionScopes: [],
        accessPolicy: createAccessPolicySnapshot(
          [
            {
              guild: { id: "one", ownerId: "owner" },
              roles: [
                {
                  permissions: [Capability.LOOTLOG_LOOTS_READ],
                  lvlRangeFrom: 0,
                  lvlRangeTo: levelTo,
                },
              ],
            },
          ],
          "member",
        ),
      },
    });

  await act(async () => {
    joined(300);
    viewport.scrollTop = 800;
    fireEvent.scroll(viewport);
    gateway.deliver(snapshot(2));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(listState()).toMatchObject({ ids: [1], newLootCount: 1 });

  page = [];
  await act(async () => {
    gateway.setConnectionState("disconnected");
    gateway.setConnectionState("ready");
    joined(100);
    await vi.advanceTimersByTimeAsync(1);
  });
  await act(async () => {
    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(listState()).toMatchObject({ ids: [], newLootCount: 0 });
});

it.each(["permissions", "reconnect"] as const)(
  "%s clears alias and canonical caches and rejects an old in-flight response",
  async (event) => {
    let resolveOld: (response: Response) => void = () => undefined;

    const oldResponse = new Promise<Response>((resolve) => {
      resolveOld = resolve;
    });

    const listRequests = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(Response.json(lootPage([loot])))
      .mockReturnValueOnce(oldResponse)
      .mockResolvedValue(Response.json(lootPage([])));

    const { gateway, client } = await mount(listRequests);
    client.setQueryData(["/guilds/one/loots/1"], loot);
    client.setQueryData(["/guilds/alias/loots/1"], loot);
    client.setQueryData(["/guilds/one/loots/stats"], { count: 1 });
    await act(async () => {
      gateway.deliver({
        v: 1,
        type: "loot.created",
        data: { version: 2, guildId: "one", lootId: 2, npcs: [] },
      });
      await vi.advanceTimersByTimeAsync(35_000);
    });
    expect(listRequests).toHaveBeenCalledTimes(2);
    await act(async () => {
      if (event === "permissions") {
        gateway.deliver({
          v: 1,
          type: "permissions.updated",
          data: {
            changes: [],
            organizationIds: [],
            subscriptionScopes: [],
            accessPolicy: createTestAccessPolicy([]),
          },
        });
      } else {
        gateway.setConnectionState("disconnected");
        gateway.setConnectionState("ready");
        gateway.deliver({
          v: 1,
          type: "session.joined",
          data: {
            connectionId: "reconnected",
            organizationIds: [],
            subscriptionScopes: [],
            accessPolicy: createTestAccessPolicy([]),
          },
        });
      }

      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("status").textContent).toContain('"ids":[]');
    expect(client.getQueryData(["/guilds/one/loots/1"])).toBeUndefined();
    expect(client.getQueryData(["/guilds/alias/loots/1"])).toBeUndefined();
    expect(client.getQueryData(["/guilds/one/loots/stats"])).toEqual({
      count: 1,
    });
    await act(async () => {
      resolveOld(Response.json(lootPage([loot])));
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("status").textContent).toContain('"ids":[]');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });
    expect(listRequests).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("status").textContent).toContain('"ids":[]');
  },
);

it.each([
  { change: "unchanged", levelTo: 300, visibleIds: [1] },
  { change: "expanded", levelTo: 500, visibleIds: [1] },
  { change: "restricted", levelTo: 100, visibleIds: [] },
])(
  "handles $change loot access after reconnect without assuming a revocation",
  async ({ levelTo, visibleIds }) => {
    const { gateway } = await mount(async () =>
      Response.json(lootPage([loot])),
    );

    const joined = (to: number) =>
      gateway.deliver({
        v: 1,
        type: "session.joined",
        data: {
          connectionId: "connection",
          organizationIds: ["one"],
          subscriptionScopes: [],
          accessPolicy: createAccessPolicySnapshot(
            [
              {
                guild: { id: "one", ownerId: "owner" },
                roles: [
                  {
                    permissions: [Capability.LOOTLOG_LOOTS_READ],
                    lvlRangeFrom: 0,
                    lvlRangeTo: to,
                  },
                ],
              },
            ],
            "member",
          ),
        },
      });

    await act(async () => {
      joined(300);
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
    await act(async () => {
      gateway.setConnectionState("disconnected");
      gateway.setConnectionState("ready");
      joined(levelTo);
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("status").textContent).toContain(
      `"ids":${JSON.stringify(visibleIds)}`,
    );
  },
);

it("reports a fetched empty page as empty but a policy clear as pending", async () => {
  const { gateway } = await mount(async () => Response.json(lootPage([])));

  expect(screen.getByRole("status").textContent).toContain(
    '"isEmpty":true,"isPending":false',
  );

  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await act(async () => {
    gateway.deliver({
      v: 1,
      type: "permissions.updated",
      data: {
        changes: [],
        organizationIds: ["one"],
        subscriptionScopes: [],
        accessPolicy: createAccessPolicySnapshot(
          [
            {
              guild: { id: "one", ownerId: "owner" },
              roles: [
                {
                  permissions: [Capability.LOOTLOG_LOOTS_READ],
                  lvlRangeFrom: 0,
                  lvlRangeTo: 100,
                },
              ],
            },
          ],
          "member",
        ),
      },
    });
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByRole("status").textContent).toContain(
    '"isEmpty":false,"isPending":true',
  );
});

it.each(["reconnect", "permissions"] as const)(
  "%s restrictions clear only the affected Organization's canonical and alias caches",
  async (event) => {
    const { gateway, client } = await mount(async () =>
      Response.json(lootPage([loot])),
    );

    const policy = (restricted: boolean) =>
      createAccessPolicySnapshot(
        ["one", "two"].map((id) => ({
          guild: { id, ownerId: "owner" },
          roles: [
            {
              permissions: [Capability.LOOTLOG_LOOTS_READ],
              lvlRangeFrom: 0,
              lvlRangeTo: restricted && id === "two" ? 100 : 300,
            },
          ],
        })),
        "member",
      );

    const baseline = {
      connectionId: "connection",
      organizationIds: ["one", "two"],
      subscriptionScopes: [],
      accessPolicy: policy(false),
    };

    await act(async () => {
      gateway.deliver({ v: 1, type: "session.joined", data: baseline });
      await vi.advanceTimersByTimeAsync(1);
    });

    for (const route of ["one", "alias", "two", "second-alias"]) {
      client.setQueryData([`/guilds/${route}/loots/1`], loot);
    }

    client.setQueryData(["/guilds/second-alias/loots", { search: "old" }], {
      pages: [lootPage([loot])],
      pageParams: [""],
    });
    await act(async () => {
      if (event === "reconnect") {
        gateway.setConnectionState("disconnected");
        gateway.setConnectionState("ready");
        gateway.deliver({
          v: 1,
          type: "session.joined",
          data: { ...baseline, accessPolicy: policy(true) },
        });
      } else {
        gateway.deliver({
          v: 1,
          type: "permissions.updated",
          data: {
            changes: [],
            organizationIds: ["one", "two"],
            subscriptionScopes: [],
            accessPolicy: policy(true),
          },
        });
      }

      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
    expect(client.getQueryData(["/guilds/one/loots/1"])).toEqual(loot);
    expect(client.getQueryData(["/guilds/alias/loots/1"])).toEqual(loot);
    expect(client.getQueryData(["/guilds/two/loots/1"])).toBeUndefined();
    expect(
      client.getQueryData(["/guilds/second-alias/loots/1"]),
    ).toBeUndefined();
    expect(
      client.getQueryData(["/guilds/second-alias/loots", { search: "old" }]),
    ).toBeUndefined();
  },
);
