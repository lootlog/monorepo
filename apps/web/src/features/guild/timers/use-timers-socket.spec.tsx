// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getTimersControllerGetTimersQueryKey,
  useTimersControllerGetTimers,
  type TimerResponseDto,
} from "@lootlog/client/main";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { configureApiClients } from "@lootlog/client/transport";
import { createElement, type PropsWithChildren } from "react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { createTestGateway } from "@/lib/testing/gateway";
import { useTimersSocket } from "./use-timers-socket";

const timer: TimerResponseDto = {
  guildId: "one",
  world: "tempest",
  timerKey: "npc:1",
  npcId: 1,
  minSpawnTime: "2099-01-01T00:00:00.000Z",
  maxSpawnTime: "2099-01-01T01:00:00.000Z",
  updatedAt: "2026-09-18T00:00:00.000Z",
  wasReset: false,
  npc: {
    id: 1,
    name: "NPC",
    prof: "w",
    lvl: 100,
    type: "ELITE2",
    location: "Map",
    wt: "20",
    icon: null,
    margonemType: "npc",
  },
};

const guilds = [
  { id: "one", vanityUrl: "alias" },
  { id: "two", vanityUrl: "second" },
];

const key = getTimersControllerGetTimersQueryKey(
  { guildId: "alias" },
  { world: "tempest" },
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mount = (fetchTimers = vi.fn(async () => Response.json([timer]))) => {
  const gateway = createTestGateway();
  gateway.request.mockResolvedValue(undefined);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  onTestFinished(
    configureApiClients({
      main: { baseUrl: "https://api.test", fetch: fetchTimers },
    }),
  );

  const hook = renderHook(
    () => {
      useTimersSocket({ socket: gateway.socket, guilds });

      return useTimersControllerGetTimers(
        { guildId: "alias" },
        { world: "tempest" },
      );
    },
    {
      wrapper: ({ children }: PropsWithChildren) =>
        createElement(QueryClientProvider, { client }, children),
    },
  );

  return { ...hook, gateway, client, fetchTimers };
};

it("patches matching create, reset and delete without HTTP, ignoring other scopes", async () => {
  const { result, gateway, fetchTimers, client } = mount();
  await waitFor(() => expect(result.current.data).toEqual([timer]));

  const inactive = getTimersControllerGetTimersQueryKey(
    { guildId: "one" },
    { world: "tempest" },
  );

  client.setQueryData(inactive, [timer]);

  const deliver = (payload: TimerResponseDto) =>
    gateway.deliver({
      v: 1,
      type: "timer.created",
      data: { organizationId: payload.guildId, payload },
    });

  const reset = { ...timer, wasReset: true };
  const added = { ...timer, timerKey: "npc:2", npcId: 2 };
  act(() => {
    deliver({ ...timer, world: "other" });
    deliver({ ...timer, guildId: "two" });
    deliver(reset);
    deliver(added);
  });
  await waitFor(() => expect(result.current.data).toEqual([reset, added]));
  expect(client.getQueryData(inactive)).toEqual([reset, added]);
  act(() =>
    gateway.deliver({
      v: 1,
      type: "timer.deleted",
      data: {
        organizationId: "one",
        payload: { guildId: "one", world: "tempest", timerKey: "npc:1" },
      },
    }),
  );
  await waitFor(() => expect(result.current.data).toEqual([added]));
  expect(client.getQueryData(inactive)).toEqual([added]);
  expect(fetchTimers).toHaveBeenCalledOnce();
});

it("reconciles an event racing the initial snapshot and rejects its late response", async () => {
  let resolveOld: (response: Response) => void = () => undefined;

  const old = new Promise<Response>((resolve) => {
    resolveOld = resolve;
  });

  const updated = { ...timer, wasReset: true };

  const fetchTimers = vi
    .fn<() => Promise<Response>>()
    .mockReturnValueOnce(old)
    .mockResolvedValue(Response.json([updated]));

  const { result, gateway } = mount(fetchTimers);
  await waitFor(() => expect(fetchTimers).toHaveBeenCalledOnce());
  act(() =>
    gateway.deliver({
      v: 1,
      type: "timer.created",
      data: { organizationId: "one", payload: updated },
    }),
  );
  await waitFor(() => expect(result.current.data).toEqual([updated]));
  await act(async () => {
    resolveOld(Response.json([timer]));
  });
  expect(result.current.data).toEqual([updated]);
  expect(fetchTimers).toHaveBeenCalledTimes(2);
});

it("refetches after rejoin to recover missed events", async () => {
  const fetchTimers = vi
    .fn<() => Promise<Response>>()
    .mockResolvedValueOnce(Response.json([timer]))
    .mockResolvedValue(Response.json([]));

  const { result, gateway } = mount(fetchTimers);
  await waitFor(() => expect(result.current.data).toEqual([timer]));
  act(() =>
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "rejoined",
        organizationIds: ["one"],
        subscriptionScopes: [],
      },
    }),
  );
  await waitFor(() => expect(fetchTimers).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(result.current.data).toEqual([]));
});

it("clears restricted cached worlds and aliases and rejects an old in-flight response", async () => {
  let resolveOld: (response: Response) => void = () => undefined;

  const old = new Promise<Response>((resolve) => {
    resolveOld = resolve;
  });

  const fetchTimers = vi
    .fn<() => Promise<Response>>()
    .mockResolvedValueOnce(Response.json([timer]))
    .mockReturnValueOnce(old)
    .mockResolvedValue(new Response(null, { status: 403 }));

  const { result, gateway, client } = mount(fetchTimers);
  await waitFor(() => expect(result.current.data).toEqual([timer]));

  const otherWorld = getTimersControllerGetTimersQueryKey(
    { guildId: "alias" },
    { world: "other" },
  );

  const canonical = getTimersControllerGetTimersQueryKey(
    { guildId: "one" },
    { world: "tempest" },
  );

  client.setQueryData(otherWorld, [timer]);
  client.setQueryData(canonical, [timer]);
  void client.invalidateQueries({ queryKey: key });
  await waitFor(() => expect(fetchTimers).toHaveBeenCalledTimes(2));
  act(() =>
    gateway.deliver({
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: ["one"], subscriptionScopes: [] },
    }),
  );
  await waitFor(() => expect(result.current.data).toEqual([]));
  expect(client.getQueryData(otherWorld)).toBeUndefined();
  expect(client.getQueryData(canonical)).toBeUndefined();
  await act(async () => {
    resolveOld(Response.json([timer]));
  });
  expect(result.current.data).toEqual([]);
});

it("refetches malformed view data instead of caching an invalid timestamp", async () => {
  const { result, gateway, fetchTimers } = mount();
  await waitFor(() => expect(result.current.data).toEqual([timer]));

  act(() =>
    gateway.deliver({
      v: 1,
      type: "timer.created",
      data: {
        organizationId: "one",
        payload: { ...timer, maxSpawnTime: "invalid" },
      },
    }),
  );
  await waitFor(() => expect(fetchTimers).toHaveBeenCalledTimes(2));
  expect(result.current.data).toEqual([timer]);
});

it("clears a restricted inactive organization's alias without disturbing the open organization", async () => {
  const { result, gateway, fetchTimers, client } = mount();
  await waitFor(() => expect(result.current.data).toEqual([timer]));

  const policy = (secondLevel: number) =>
    createAccessPolicySnapshot(
      guilds.map((guild) => ({
        guild: { id: guild.id, ownerId: "owner" },
        roles: [
          {
            permissions: [Permission.LOOTLOG_TIMERS_READ],
            lvlRangeFrom: 0,
            lvlRangeTo: guild.id === "two" ? secondLevel : 300,
          },
        ],
      })),
      "member",
    );

  act(() =>
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "joined",
        organizationIds: ["one", "two"],
        subscriptionScopes: [],
        accessPolicy: policy(300),
      },
    }),
  );
  await waitFor(() => expect(fetchTimers).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(result.current.data).toEqual([timer]));

  const secondKey = getTimersControllerGetTimersQueryKey(
    { guildId: "second" },
    { world: "tempest" },
  );

  client.setQueryData(secondKey, [{ ...timer, guildId: "two" }]);

  act(() =>
    gateway.deliver({
      v: 1,
      type: "permissions.updated",
      data: {
        organizationIds: ["one", "two"],
        subscriptionScopes: [],
        accessPolicy: policy(50),
      },
    }),
  );
  expect(client.getQueryData(secondKey)).toBeUndefined();
  expect(result.current.data).toEqual([timer]);
  expect(fetchTimers).toHaveBeenCalledTimes(2);
});
