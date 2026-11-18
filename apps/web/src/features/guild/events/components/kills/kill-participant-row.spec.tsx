import { createMemberDirectoryTestWrapper } from "@/lib/testing/member-directory";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import type { ReactElement } from "react";
import {
  cleanup,
  fireEvent,
  render as renderElement,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { KillDetailParticipant } from "../../hooks/queries/use-kill-detail";
import { KillParticipantRow } from "./kill-participant-row";

await initializeTestTranslations();

const wrapper = await createMemberDirectoryTestWrapper();

const render = (element: ReactElement) => renderElement(element, { wrapper });

afterEach(cleanup);

describe("KillParticipantRow", () => {
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

  it("toggles the point and map breakdown from an accessible expansion control", () => {
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

    expect(screen.getByRole("dialog")).toBeTruthy();
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
