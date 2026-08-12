// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { KillDetailParticipant } from "../../hooks/queries/use-kill-detail";
import { KillParticipantRow } from "./kill-participant-row";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/member">{children}</a>
  ),
}));

vi.mock("../dialogs/manual-points-edit-dialog", () => ({
  ManualPointsEditDialog: ({ open }: { open: boolean }) =>
    open ? <div>edit-dialog</div> : null,
}));

afterEach(cleanup);

describe("KillParticipantRow", () => {
  it("uses compact desktop row metrics and standard member typography", () => {
    const { container } = render(
      <KillParticipantRow
        participant={createParticipant()}
        rank={1}
        isExpanded={false}
        onToggle={() => {}}
      />,
    );

    const summaryRow = container.querySelector(".grid.min-h-14");
    const memberName = screen.getByText("Tester");

    expect(summaryRow?.className).toContain("lg:min-h-12");
    expect(summaryRow?.className).toContain("py-0");
    expect(memberName.className).toContain("text-sm");
  });

  it("uses the regular table font size for desktop time and AFK values", () => {
    const participant = createParticipant({
      mapData: [
        {
          mapId: "map-1",
          mapName: "Pradawne Wzgórze",
          assignedAt: "2026-08-12T08:00:00.000Z",
          unassignedAt: "2026-08-12T09:30:00.000Z",
          assignmentDurationSeconds: 5_400,
          presenceTimeSeconds: 5_359,
          afkTimeSeconds: 41,
        },
      ],
    });
    const { container } = render(
      <KillParticipantRow
        participant={participant}
        rank={1}
        isExpanded={false}
        onToggle={() => {}}
      />,
    );

    const desktopMetrics = container.querySelectorAll("span.hidden.text-right");

    expect(desktopMetrics).toHaveLength(2);
    desktopMetrics.forEach((metric) => {
      expect(metric.className).toContain("text-sm");
      expect(metric.className).not.toContain("text-xs");
    });
  });

  it("renders one member link with a decorative external-link icon", () => {
    render(
      <KillParticipantRow
        participant={createParticipant()}
        rank={1}
        isExpanded={false}
        onToggle={() => {}}
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    const memberLink = screen.getByRole("link", { name: "Tester" });

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(memberLink.querySelector(".lucide-external-link")).toBeTruthy();
    expect(
      memberLink
        .querySelector(".lucide-external-link")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("shows the manual adjustment indicator only for a non-zero adjustment", () => {
    const { rerender } = render(
      <KillParticipantRow
        participant={createParticipant({ manualAdjustmentPoints: 0 })}
        rank={1}
        isExpanded={false}
        onToggle={() => {}}
      />,
    );

    expect(screen.queryByLabelText("events.points.modified")).toBeNull();

    rerender(
      <KillParticipantRow
        participant={createParticipant({ manualAdjustmentPoints: 0.25 })}
        rank={1}
        isExpanded={false}
        onToggle={() => {}}
      />,
    );

    expect(screen.getByLabelText("events.points.modified")).toBeTruthy();
  });

  it("exposes an accessible expansion control and renders the point and map breakdown", () => {
    const onToggle = vi.fn();
    const participant = createParticipant({ manualAdjustmentPoints: 0.25 });
    const { rerender } = render(
      <KillParticipantRow
        participant={participant}
        rank={1}
        isExpanded={false}
        onToggle={onToggle}
      />,
    );

    const expandButton = screen.getByRole("button", {
      name: "events.kills.expandParticipant",
    });
    fireEvent.click(expandButton);
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(
      <KillParticipantRow
        participant={participant}
        rank={1}
        isExpanded
        onToggle={onToggle}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "events.kills.collapseParticipant",
      }),
    ).toBeTruthy();
    expect(screen.getByText("events.kills.scoringBreakdown")).toBeTruthy();
    expect(
      screen.getByText("events.kills.pointsTooltip.basePoints"),
    ).toBeTruthy();
    expect(
      screen.getByText("events.kills.pointsTooltip.manualAdjustment"),
    ).toBeTruthy();
    expect(screen.getByText("Pradawne Wzgórze")).toBeTruthy();
    expect(
      screen.getByText("events.kills.scoringBreakdown").parentElement
        ?.parentElement?.className,
    ).toContain("bg-muted/40");
  });

  it("allows point editing only when the viewer has permission", () => {
    const { rerender } = render(
      <KillParticipantRow
        participant={createParticipant()}
        rank={1}
        isExpanded={false}
        onToggle={() => {}}
        canEdit={false}
      />,
    );

    expect(screen.queryByLabelText("events.points.edit")).toBeNull();

    rerender(
      <KillParticipantRow
        participant={createParticipant()}
        rank={1}
        isExpanded={false}
        onToggle={() => {}}
        canEdit
      />,
    );
    fireEvent.click(screen.getByLabelText("events.points.edit"));

    expect(screen.getByText("edit-dialog")).toBeTruthy();
  });
});

function createParticipant(
  overrides: Partial<KillDetailParticipant> = {},
): KillDetailParticipant {
  return {
    id: "point-1",
    memberId: 7,
    points: 1.75,
    basePoints: 1,
    manualAdjustmentPoints: 0,
    trackingDurationSeconds: 5_400,
    trackingDurationPercentage: 75,
    timeOnMapSeconds: 5_400,
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
    mapData: [
      {
        mapId: "map-1",
        mapName: "Pradawne Wzgórze",
        assignedAt: "2026-08-12T08:00:00.000Z",
        unassignedAt: "2026-08-12T09:30:00.000Z",
        assignmentDurationSeconds: 5_400,
        presenceTimeSeconds: 5_400,
        afkTimeSeconds: 0,
      },
    ],
    ...overrides,
  };
}
