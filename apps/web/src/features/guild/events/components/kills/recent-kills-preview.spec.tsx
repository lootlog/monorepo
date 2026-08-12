// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRecentHeroKills } from "../../hooks/queries/use-recent-hero-kills";
import { RecentKillsPreview } from "./recent-kills-preview";

const tabsMockState = vi.hoisted(() => ({
  onValueChange: undefined as ((value: string) => void) | undefined,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
    params,
    to,
  }: {
    children: ReactNode;
    className?: string;
    params: Record<string, string>;
    to: string;
  }) => {
    const href = to.includes("heroes")
      ? `/${params.guildId}/events/${params.eventId}/heroes/${params.heroId}/kills`
      : `/${params.guildId}/events/${params.eventId}/kills`;

    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

vi.mock("@lootlog/ui/components/tabs", () => ({
  Tabs: ({
    children,
    onValueChange,
  }: {
    children: ReactNode;
    onValueChange: (value: string) => void;
  }) => {
    tabsMockState.onValueChange = onValueChange;
    return <div>{children}</div>;
  },
  TabsTrigger: ({
    children,
    value,
  }: {
    children: ReactNode;
    value: string;
  }) => (
    <button
      type="button"
      onClick={() => tabsMockState.onValueChange?.(value)}
      data-value={value}
    >
      {children}
    </button>
  ),
}));

vi.mock("../shared/event-scrollable-tabs-list", () => ({
  EventScrollableTabsList: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../../hooks/queries/use-recent-hero-kills", () => ({
  useRecentHeroKills: vi.fn(),
}));

vi.mock("./event-kills-table", () => ({
  EventKillsTable: ({
    hasError,
    isLoading,
    kills,
    variant,
  }: {
    hasError: boolean;
    isLoading: boolean;
    kills: unknown[];
    variant: string;
  }) => (
    <div data-testid="kills-table">
      {`${variant}:${String(isLoading)}:${String(hasError)}:${kills.length}`}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RecentKillsPreview", () => {
  it("renders the ranking-style header and event-wide history link", () => {
    mockRecentKillsQuery({ data: [{ id: "kill-1" }] });

    render(<RecentKillsPreview guildId="guild-1" eventId="event-1" />);

    const viewAllLink = screen.getByRole("link", {
      name: "events.kills.viewAll",
    });
    expect(viewAllLink.closest("header")).toBeTruthy();
    expect(viewAllLink.getAttribute("href")).toBe(
      "/guild-1/events/event-1/kills",
    );
    expect(viewAllLink.getAttribute("class")).toContain("hover:text-primary");
    expect(viewAllLink.getAttribute("class")).not.toContain("hover:bg-");
    expect(screen.getByTestId("kills-table").textContent).toBe(
      "preview:false:false:1",
    );
  });

  it("keeps the query and header destination on the same active hero", () => {
    mockRecentKillsQuery({ data: [{ id: "kill-1" }] });

    render(
      <RecentKillsPreview
        guildId="guild-1"
        eventId="event-1"
        heroNpcs={[
          {
            id: "hero-1",
            npcIcon: null,
            npcId: null,
            npcLvl: null,
            npcName: "Zorin",
          },
          {
            id: "hero-2",
            npcIcon: null,
            npcId: null,
            npcLvl: null,
            npcName: "Maddok",
          },
        ]}
        showHeroTabs
      />,
    );

    expect(screen.getByRole("link").getAttribute("href")).toContain(
      "/heroes/hero-1/kills",
    );

    fireEvent.click(screen.getByRole("button", { name: "Maddok" }));

    expect(vi.mocked(useRecentHeroKills)).toHaveBeenLastCalledWith({
      eventId: "event-1",
      guildId: "guild-1",
      heroId: "hero-2",
      limit: 5,
    });
    expect(screen.getByRole("link").getAttribute("href")).toContain(
      "/heroes/hero-2/kills",
    );
  });

  it.each([
    ["loading", { data: undefined, isError: false, isLoading: true }],
    ["empty", { data: [], isError: false, isLoading: false }],
    ["error", { data: undefined, isError: true, isLoading: false }],
  ])("keeps the %s state inside the widget without the action", (_, query) => {
    mockRecentKillsQuery(query);

    render(<RecentKillsPreview guildId="guild-1" eventId="event-1" />);

    expect(
      screen.getByRole("heading", { name: "events.kills.recentTitle" }),
    ).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByTestId("kills-table")).toBeTruthy();
  });
});

function mockRecentKillsQuery({
  data,
  isError = false,
  isLoading = false,
}: {
  data?: unknown[];
  isError?: boolean;
  isLoading?: boolean;
}) {
  vi.mocked(useRecentHeroKills).mockReturnValue({
    data,
    isError,
    isLoading,
  } as ReturnType<typeof useRecentHeroKills>);
}
