// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { GatewayProvider } from "./gateway-context";

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, (payload?: unknown) => void>(),
}));
vi.mock("@/lib/gateway-client", () => ({
  socket: {
    connected: true,
    on: (event: string, handler: (payload?: unknown) => void) =>
      handlers.set(event, handler),
    off: (event: string) => handlers.delete(event),
    emit: vi.fn(),
  },
}));
vi.mock("@/hooks/utils/use-kill-stats-updates", () => ({
  useKillStatsUpdates: () => {},
}));
vi.mock("@/hooks/api/user/use-user", () => ({
  useUser: () => ({ user: undefined }),
}));
vi.mock("@/hooks/context/use-guild-id", () => ({ useGuildId: () => "one" }));
vi.mock("@lootlog/client/main", () => ({
  useUsersControllerGetCurrentUserAccessibleGuilds: () => ({ data: [] }),
}));

describe("GatewayProvider permissions", () => {
  it("clears old data after rejoin without a permissions update", () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <GatewayProvider>
          <div />
        </GatewayProvider>
      </QueryClientProvider>,
    );
    act(() => handlers.get(GatewayEvent.JOIN)?.({ status: "success" }));
    client.setQueryData(["/guilds/one/timers"], ["hidden titan"]);
    act(() => {
      handlers.get(GatewayEvent.DISCONNECT)?.();
      handlers.get(GatewayEvent.CONNECT)?.();
      handlers.get(GatewayEvent.JOIN)?.({ status: "success" });
    });
    expect(client.getQueryData(["/guilds/one/timers"])).toBeUndefined();
    client.clear();
  });

  it("removes previously visible timers, loots and metadata on permission changes", () => {
    const client = new QueryClient();
    client.setQueryData(["/guilds/one/timers"], ["hidden titan"]);
    client.setQueryData(["/guilds/one/loots/1"], { npc: "hidden titan" });
    client.setQueryData(["/guilds/one/members/refresh-jobs/latest"], {
      id: "private-job",
    });
    client.setQueryData(["/users/@me/preferences"], { theme: "dark" });
    render(
      <QueryClientProvider client={client}>
        <GatewayProvider>
          <div />
        </GatewayProvider>
      </QueryClientProvider>,
    );
    act(() => handlers.get(GatewayEvent.PERMISSIONS_UPDATED)?.());
    expect(client.getQueryData(["/guilds/one/timers"])).toBeUndefined();
    expect(client.getQueryData(["/guilds/one/loots/1"])).toBeUndefined();
    expect(
      client.getQueryData(["/guilds/one/members/refresh-jobs/latest"]),
    ).toBeUndefined();
    expect(client.getQueryData(["/users/@me/preferences"])).toEqual({
      theme: "dark",
    });
    client.clear();
  });
});
