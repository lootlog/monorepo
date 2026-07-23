import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let socketState = {
  connected: false,
  joined: false,
  joinedGuilds: [] as string[],
};

let mockGuilds = [
  { id: "guild-1", name: "Alpha" },
  { id: "guild-2", name: "Beta" },
];

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => socketState,
}));

vi.mock("@lootlog/api-client/react-query/main/users", () => ({
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey: () => ["guilds"],
  useUsersControllerGetCurrentUserAccessibleGuilds: () => ({
    data: mockGuilds,
  }),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { TimersConnectionStatus } from "./timers-connection-status";

describe("TimersConnectionStatus", () => {
  beforeEach(() => {
    socketState = {
      connected: false,
      joined: false,
      joinedGuilds: [],
    };
    mockGuilds = [
      { id: "guild-1", name: "Alpha" },
      { id: "guild-2", name: "Beta" },
    ];
  });

  it("shows the disconnected state when the socket is not joined", () => {
    const { container } = render(<TimersConnectionStatus />);

    expect(screen.getByText("Nie połączono z żadnym serwerem")).toBeVisible();
    expect(container.querySelector(".ll\\:bg-red-400")).toBeTruthy();
  });

  it("shows connected guild names when the timers socket joined servers", () => {
    socketState = {
      connected: true,
      joined: true,
      joinedGuilds: ["guild-2", "guild-1"],
    };

    const { container } = render(<TimersConnectionStatus />);

    expect(screen.getByText("Połączono z serwerami:")).toBeVisible();
    expect(screen.getByText("Beta")).toBeVisible();
    expect(screen.getByText("Alpha")).toBeVisible();
    expect(container.querySelector(".ll\\:bg-green-400")).toBeTruthy();
  });
});
