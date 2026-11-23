// @vitest-environment happy-dom
import { act, screen } from "@testing-library/react";
import { RealtimeClient } from "@lootlog/client/realtime";
import { expect, it, vi } from "vitest";
import { createTestAccessPolicy } from "@/lib/testing/gateway";
import { loot, lootPage, mount } from "./use-live-loot-list.fixtures";

it("retains visible loots through reconnect, background refresh and its failure", async () => {
  let resolvePending: (response: Response) => void = () => undefined;

  const pending = new Promise<Response>((resolve) => {
    resolvePending = resolve;
  });

  const listRequests = vi
    .fn<() => Promise<Response>>()
    .mockResolvedValueOnce(Response.json(lootPage([loot])))
    .mockReturnValueOnce(pending)
    .mockResolvedValueOnce(Response.json(lootPage([{ ...loot, id: 2 }])));

  const { gateway } = await mount(listRequests);

  await act(async () => {
    gateway.setConnectionState("disconnected");
    gateway.setConnectionState("ready");
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "reconnected",
        organizationIds: ["one"],
        subscriptionScopes: [],
        accessPolicy: createTestAccessPolicy(["one"]),
      },
    });
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  expect(listRequests).toHaveBeenCalledTimes(2);
  await act(async () => {
    resolvePending(new Response(null, { status: 503 }));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByRole("status").textContent).toContain(
    '"ids":[1],"isEmpty":false,"isPending":false,"isFailed":false',
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(65_000);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[2]');
  expect(listRequests).toHaveBeenCalledTimes(3);
});

it("does not refetch the list after the page's first join", async () => {
  vi.spyOn(RealtimeClient.prototype, "connect").mockReturnValue(undefined);
  const listRequests = vi.fn(async () => Response.json(lootPage([loot])));
  const { gateway } = await mount(listRequests);
  gateway.socket.connect();
  await act(async () => {
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "connection",
        organizationIds: ["one", "two"],
        subscriptionScopes: [],
        accessPolicy: createTestAccessPolicy(["one", "two"]),
      },
    });
    await vi.advanceTimersByTimeAsync(40_000);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  expect(listRequests).toHaveBeenCalledTimes(1);
});

it("keeps fetched loots when joining before the route alias is resolved", async () => {
  let resolveGuilds: (response: Response) => void = () => undefined;

  const pendingGuilds = new Promise<Response>((resolve) => {
    resolveGuilds = resolve;
  });

  const listRequests = vi.fn(async () => Response.json(lootPage([loot])));
  const { gateway } = await mount(listRequests, () => pendingGuilds);

  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  await act(async () => {
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "connection",
        organizationIds: ["one"],
        subscriptionScopes: [],
        accessPolicy: createTestAccessPolicy(["one"]),
      },
    });
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  await act(async () => {
    resolveGuilds(Response.json([{ id: "one", vanityUrl: "alias" }]));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByRole("status").textContent).toContain('"ids":[1]');
  expect(listRequests).toHaveBeenCalledTimes(1);
});
