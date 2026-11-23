// @vitest-environment happy-dom
import { act, fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import {
  listState,
  loot,
  lootPage,
  mount,
  snapshot,
} from "./use-live-loot-list.fixtures";

it.each(["filter", "world"])(
  "changing the %s returns to the top and resumes live reconciliation",
  async (change) => {
    const listRequests = vi.fn(async () => Response.json(lootPage([loot])));
    const { gateway, changeWorld } = await mount(listRequests);
    const viewport = screen.getByTestId("loot-scroll");

    await act(async () => {
      viewport.scrollTop = 800;
      fireEvent.scroll(viewport);
      gateway.deliver({
        v: 1,
        type: "loot.created",
        data: { version: 2, guildId: "one", lootId: 2, npcs: [] },
      });
      await vi.advanceTimersByTimeAsync(35_000);
    });
    expect(listRequests).toHaveBeenCalledTimes(1);

    await act(async () => {
      if (change === "filter") {
        fireEvent.click(screen.getByRole("button", { name: "Change filter" }));
      } else {
        changeWorld();
      }

      await vi.advanceTimersByTimeAsync(250);
    });
    expect(viewport.scrollTop).toBe(0);
    expect(listRequests).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });
    expect(listRequests).toHaveBeenCalledTimes(3);
  },
);

it("delivered duplicate, share and reconnect events reconcile once through the filtered server list without detail GETs", async () => {
  const listRequests = vi.fn(async () => Response.json(lootPage([loot])));
  const { gateway, fetch } = await mount(listRequests);
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  await act(async () => {
    for (let event = 0; event < 200; event++)
      gateway.deliver({
        v: 1,
        type: "loot.created",
        data: { version: 2, guildId: "one", lootId: 2, npcs: [] },
      });
    gateway.deliver({
      v: 1,
      type: "loot.share-updated",
      data: { version: 2, guildId: "one", lootId: 2, npcs: [], lootShare: {} },
    });
    gateway.setConnectionState("disconnected");
    gateway.setConnectionState("ready");
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(listRequests).toHaveBeenCalledTimes(2);
  expect(
    fetch.mock.calls.filter(([input]) => String(input).includes("/loots/")),
  ).toHaveLength(0);
  expect(
    fetch.mock.calls
      .filter(([input]) => String(input).includes("/loots?"))
      .every(([input]) => String(input).includes("search=sword")),
  ).toBe(true);
  await act(async () => {
    gateway.deliver({
      v: 1,
      type: "loot.created",
      data: { version: 2, guildId: "other", lootId: 3, npcs: [] },
    });
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(listRequests).toHaveBeenCalledTimes(2);
});

it("places delivered loot snapshots without requests, holding them while the reader is scrolled down", async () => {
  const listRequests = vi.fn(async () => Response.json(lootPage([loot])));
  const { gateway, fetch } = await mount(listRequests, undefined, "");
  const viewport = screen.getByTestId("loot-scroll");

  await act(async () => {
    gateway.deliver(snapshot(2));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(listState()).toMatchObject({ ids: [2, 1], newLootCount: 0 });

  await act(async () => {
    viewport.scrollTop = 800;
    fireEvent.scroll(viewport);
    gateway.deliver(snapshot(3));
    gateway.deliver(snapshot(4, "katahha"));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(listState()).toMatchObject({ ids: [2, 1], newLootCount: 1 });

  await act(async () => {
    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(listState()).toMatchObject({ ids: [3, 2, 1], newLootCount: 0 });
  expect(listRequests).toHaveBeenCalledTimes(1);
  expect(
    fetch.mock.calls.filter(([input]) => String(input).includes("/loots/")),
  ).toHaveLength(0);
});

it.each([
  { case: "a search the server must match", searchParams: "search=sword" },
  { case: "a snapshot without its loot", searchParams: "" },
])("reconciles through the server list for $case", async ({ searchParams }) => {
  const listRequests = vi.fn(async () => Response.json(lootPage([loot])));
  const { gateway } = await mount(listRequests, undefined, searchParams);
  const { loot: _loot, ...withoutLoot } = snapshot(2).data;

  await act(async () => {
    gateway.deliver(
      searchParams
        ? snapshot(2)
        : { v: 1, type: "loot.snapshot", data: withoutLoot },
    );
    await vi.advanceTimersByTimeAsync(1);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(listRequests).toHaveBeenCalledTimes(2);
});

it("resumes event reconciliation for new filters after an old filter's refresh fails", async () => {
  const listRequests = vi
    .fn<() => Promise<Response>>()
    .mockResolvedValueOnce(Response.json(lootPage([loot])))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockImplementation(async () =>
      Response.json(lootPage([{ ...loot, id: 2 }])),
    );

  const { gateway, fetch } = await mount(listRequests);
  await act(async () => {
    gateway.deliver({
      v: 1,
      type: "loot.created",
      data: { version: 2, guildId: "one", lootId: 2, npcs: [] },
    });
    await vi.advanceTimersByTimeAsync(35_000);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Change filter" }));
    await vi.advanceTimersByTimeAsync(250);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[2]');
  await act(async () => {
    gateway.deliver({
      v: 1,
      type: "loot.created",
      data: { version: 2, guildId: "one", lootId: 3, npcs: [] },
    });
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(listRequests).toHaveBeenCalledTimes(4);
  expect(
    fetch.mock.calls.filter(([input]) =>
      String(input).includes("search=shield"),
    ),
  ).toHaveLength(2);
});
