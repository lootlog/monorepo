// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KillParticipantsCard } from "./kill-participants-card";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@lootlog/api-client/react-query/main/events", () => ({
  useEventsRankingControllerUpdateKillPoint: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

afterEach(cleanup);

describe("KillParticipantsCard", () => {
  it("matches the map table header height and separator contract", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <KillParticipantsCard participants={[createParticipant()]} />
      </QueryClientProvider>,
    );

    const playerHeader = screen.getByText(
      "events.ranking.player",
    ).parentElement;

    expect(playerHeader?.className).toContain("h-9");
    expect(playerHeader?.className).toContain("border-y");
    expect(playerHeader?.className).not.toContain("py-2");
  });

  it("renders the empty participant state without analytical rows", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <KillParticipantsCard participants={[]} />
      </QueryClientProvider>,
    );

    expect(screen.getByText("events.kills.noParticipants")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "events.kills.expandParticipant",
      }),
    ).toBeNull();
  });
});

function createParticipant() {
  return {
    id: "point-1",
    memberId: 7,
    points: 1,
    basePoints: 1,
    manualAdjustmentPoints: 0,
    trackingDurationSeconds: 3_600,
    trackingDurationPercentage: 100,
    timeOnMapSeconds: 3_600,
    afkPercentage: 0,
    wasPresent: true,
    bonusBreakdown: null,
    member: {
      id: 7,
      name: "Tester",
      avatar: null,
      userId: "user-7",
      roles: [],
    },
    mapData: [],
  };
}
