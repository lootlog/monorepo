import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permission } from "@lootlog/types";
import type * as ReactQueryModule from "@tanstack/react-query";

const mockUseQueries = vi.fn();

let mockGuilds = [
  { id: "guild-1", name: "Alpha", icon: null, ownerId: "owner-1" },
  { id: "guild-2", name: "Beta", icon: null, ownerId: "owner-1" },
];

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof ReactQueryModule>(
    "@tanstack/react-query",
  );

  return {
    ...actual,
    useQueries: (...args: unknown[]) => mockUseQueries(...args),
  };
});

vi.mock("@/lib/api/generated/main/users/users", () => ({
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey: () => ["guilds"],
  useUsersControllerGetCurrentUserAccessibleGuilds: () => ({
    data: mockGuilds,
  }),
}));

vi.mock("@/lib/api/generated/main/guilds/guilds", () => ({
  getGuildsControllerGetGuildPermissionsQueryKey: ({
    guildId,
  }: {
    guildId: string;
  }) => ["permissions", guildId],
  guildsControllerGetGuildPermissions: vi.fn(),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/context-menu", () => ({
  ContextMenuItem: ({
    children,
    onClick,
    onSelect,
  }: {
    children: ReactNode;
    onClick?: () => void;
    onSelect?: (event: { preventDefault: () => void }) => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        onSelect?.({ preventDefault: vi.fn() });
        onClick?.();
      }}
    >
      {children}
    </button>
  ),
}));

import { DeleteTimerPopover } from "./delete-timer-popover";

const timer = {
  mergedGuildIds: [
    { guildId: "guild-1", npcId: 10, timerKey: "timer-1" },
    { guildId: "guild-2", npcId: 10, timerKey: "timer-2" },
  ],
} as never;

describe("DeleteTimerPopover", () => {
  beforeEach(() => {
    mockUseQueries.mockReset();
    mockGuilds = [
      { id: "guild-1", name: "Alpha", icon: null, ownerId: "owner-1" },
      { id: "guild-2", name: "Beta", icon: null, ownerId: "owner-1" },
    ];
  });

  it("returns nothing when no merged guild has delete permissions", () => {
    mockUseQueries.mockReturnValue([{ data: [] }, { data: [] }]);

    const { container } = render(
      <DeleteTimerPopover timer={timer} onDeleteTimer={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("treats LOOTLOG_TIMERS_DELETE as sufficient permission for single-guild delete", async () => {
    const user = userEvent.setup();
    const onDeleteTimer = vi.fn();

    mockUseQueries.mockReturnValue([
      { data: [Permission.LOOTLOG_TIMERS_DELETE] },
      { data: [] },
    ]);

    render(<DeleteTimerPopover timer={timer} onDeleteTimer={onDeleteTimer} />);

    await user.click(screen.getByRole("button", { name: "Usuń timer" }));

    expect(onDeleteTimer).toHaveBeenCalledWith("guild-1", "timer-1");
  });

  it("renders a guild chooser when multiple guilds can delete the timer", async () => {
    const user = userEvent.setup();
    const onDeleteTimer = vi.fn();

    mockUseQueries.mockReturnValue([
      { data: [Permission.ADMIN] },
      { data: [Permission.OWNER] },
    ]);

    render(<DeleteTimerPopover timer={timer} onDeleteTimer={onDeleteTimer} />);

    expect(
      screen.getByText("Wybierz serwer do usunięcia timera:"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Beta" }));

    expect(onDeleteTimer).toHaveBeenCalledWith("guild-2", "timer-2");
  });
});
