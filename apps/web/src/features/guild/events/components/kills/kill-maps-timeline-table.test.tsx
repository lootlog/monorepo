// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render as renderElement,
  screen,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { createMemberDirectoryTestWrapper } from "@/lib/testing/member-directory";
import type { MapTimelineData } from "@/lib/api/event-types";
import { stubResultsTableViewport } from "@/lib/testing/viewport";
import { KillMapsTimelineTable } from "./kill-maps-timeline-table";

const { t } = await initializeTestTranslations();

const wrapper = await createMemberDirectoryTestWrapper();

const render = (element: ReactElement) => renderElement(element, { wrapper });

const startTime = new Date("2026-08-12T08:00:00.000Z");

const endTime = new Date("2026-08-12T10:00:00.000Z");

beforeEach(stubResultsTableViewport);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("KillMapsTimelineTable", () => {
  it("groups repeated assignments and reveals every period without duplicate key warnings", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    renderTable([createMapWithRepeatedAssignment()]);

    expect(screen.getByText("Pradawne Wzgórze")).toBeTruthy();
    expect(
      screen.getAllByText("events.killDetail.mapCoverage.memberCount"),
    ).toHaveLength(1);

    const mapToggle = screen.getByRole("button", {
      name: "events.killDetail.mapCoverage.expandMap",
    });

    expect(mapToggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(mapToggle);
    expect(mapToggle.getAttribute("aria-expanded")).toBe("true");
    expect(mapToggle.getAttribute("aria-controls")).toBe("map-map-1-details");

    const detail = document.getElementById("map-map-1-details");
    expect(detail?.getAttribute("aria-labelledby")).toBe("map-map-1-summary");

    expect(screen.getAllByText("Tester")).toHaveLength(1);
    expect(
      screen.queryByText("events.killDetail.mapCoverage.assignmentPeriods"),
    ).toBeNull();

    const assignmentToggle = screen.getByRole("button", {
      name: "events.killDetail.mapCoverage.assignmentPeriodsAccessible",
    });

    fireEvent.click(assignmentToggle);
    expect(assignmentToggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByText(/\d{2}:\d{2} – \d{2}:\d{2}/)).toHaveLength(2);
    expect(consoleError.mock.calls).not.toEqual(
      expect.arrayContaining([
        expect.arrayContaining([expect.stringContaining("same key")]),
      ]),
    );

    consoleError.mockRestore();
  });

  it("keeps multiple maps expanded by stable map id after data reordering", () => {
    const firstMap = createMapWithRepeatedAssignment();
    const secondMap = createMapWithGaps();
    const { rerender } = renderTable([firstMap, secondMap]);

    const toggles = screen.getAllByRole("button", {
      name: "events.killDetail.mapCoverage.expandMap",
    });

    fireEvent.click(toggles[0]!);
    fireEvent.click(toggles[1]!);

    expect(document.getElementById("map-map-1-details")).toBeTruthy();
    expect(document.getElementById("map-map-gaps-details")).toBeTruthy();

    rerender(
      <KillMapsTimelineTable
        maps={[secondMap, firstMap]}
        startTime={startTime}
        endTime={endTime}
        t={t}
      />,
    );

    expect(document.getElementById("map-map-1-details")).toBeTruthy();
    expect(document.getElementById("map-map-gaps-details")).toBeTruthy();
  });

  it("shows normalized diagnostics and expands the complete gap audit", () => {
    renderTable([createMapWithGaps()]);

    fireEvent.click(
      screen.getByRole("button", {
        name: "events.killDetail.mapCoverage.expandMap",
      }),
    );

    expect(
      screen.getByText("events.killDetail.mapCoverage.covered"),
    ).toBeTruthy();
    expect(
      screen.getByText("events.killDetail.mapCoverage.longestGaps"),
    ).toBeTruthy();
    expect(screen.getByText("20m")).toBeTruthy();
    expect(screen.getByText("15m")).toBeTruthy();
    expect(screen.getAllByText("10m").length).toBeGreaterThan(0);
    expect(screen.queryByText("5m")).toBeNull();

    const auditToggle = screen.getByRole("button", {
      name: /events\.killDetail\.mapCoverage\.showAllGaps/,
    });

    fireEvent.click(auditToggle);
    expect(auditToggle.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByText("events.killDetail.mapCoverage.allGaps"),
    ).toBeTruthy();
    expect(screen.getByText("5m")).toBeTruthy();
  });

  it("renders an unavailable state for an invalid kill window", () => {
    render(
      <KillMapsTimelineTable
        maps={[createMapWithRepeatedAssignment()]}
        startTime={endTime}
        endTime={startTime}
        t={t}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "events.killDetail.mapCoverage.expandMap",
      }),
    );
    expect(
      screen.getByText("events.killDetail.mapCoverage.unavailableData"),
    ).toBeTruthy();
    expect(
      screen.queryByText("events.killDetail.mapCoverage.covered"),
    ).toBeNull();
  });
});

function renderTable(maps: MapTimelineData[]) {
  return render(
    <KillMapsTimelineTable
      maps={maps}
      startTime={startTime}
      endTime={endTime}
      t={t}
    />,
  );
}

function createMapWithRepeatedAssignment(): MapTimelineData {
  return {
    mapId: "map-1",
    mapName: "Pradawne Wzgórze",
    numericMapId: 123,
    assignments: [
      {
        member: { id: 7, name: "Tester", avatar: null, userId: "user-7" },
        assignedAt: "2026-08-12T08:00:00.000Z",
        unassignedAt: "2026-08-12T08:30:00.000Z",
      },
      {
        member: { id: 7, name: "Tester", avatar: null, userId: "user-7" },
        assignedAt: "2026-08-12T09:00:00.000Z",
        unassignedAt: "2026-08-12T09:30:00.000Z",
      },
    ],
    gaps: [],
  };
}

function createMapWithGaps(): MapTimelineData {
  return {
    mapId: "map-gaps",
    mapName: "Gvar Hamryd",
    numericMapId: 5988,
    assignments: [],
    gaps: [
      createGap("gap-1", "UNCOVERED", "08:05", "08:10"),
      createGap("gap-2", "UNASSIGNED", "08:20", "08:30"),
      createGap("gap-3", "UNCOVERED", "08:40", "08:55"),
      createGap("gap-4", "UNCOVERED", "09:10", "09:30"),
    ],
  };
}

function createGap(
  id: string,
  gapType: "UNCOVERED" | "UNASSIGNED",
  startedAt: string,
  endedAt: string,
): MapTimelineData["gaps"][number] {
  return {
    id,
    gapType,
    startedAt: `2026-08-12T${startedAt}:00.000Z`,
    endedAt: `2026-08-12T${endedAt}:00.000Z`,
    durationSeconds: 1,
  };
}
