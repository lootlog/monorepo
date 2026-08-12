// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TFunction } from "i18next";
import type { MapTimelineData } from "../../types/api";
import { KillMapsTimelineTable } from "./kill-maps-timeline-table";

const t = ((key: string) => key) as TFunction;
const startTime = new Date("2026-08-12T08:00:00.000Z");
const endTime = new Date("2026-08-12T10:00:00.000Z");

beforeEach(() => installMatchMedia(false));
afterEach(cleanup);

describe("KillMapsTimelineTable", () => {
  it("renders the desktop columns in the approved order and separates the map id", () => {
    renderTable([createMapWithRepeatedAssignment()]);

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual([
      "events.killDetail.mapCoverage.columns.id",
      "events.killDetail.mapCoverage.columns.map",
      "events.killDetail.mapCoverage.columns.participants",
      "events.killDetail.mapCoverage.columns.coverage",
      "events.killDetail.mapCoverage.columns.actions",
    ]);
    expect(screen.getByText("#123").closest("td")?.cellIndex).toBe(0);
    expect(screen.getByText("Pradawne Wzgórze").closest("td")?.cellIndex).toBe(
      1,
    );
    const columnWidths = Array.from(document.querySelectorAll("col")).map(
      (column) => column.className,
    );
    expect(columnWidths[0]).toBe("w-16");
    const coverage = screen.getByText("100%");
    expect(coverage.className).toContain("text-sm");
    expect(coverage.className).not.toContain("text-xs");
    expect(coverage.className).toContain("text-green-500");
    expect(coverage.className).not.toContain("bg-");
  });

  it("uses the shared coverage thresholds in table rows and expanded diagnostics", () => {
    const maps = [
      createMapWithCoverage("red", 49),
      createMapWithCoverage("amber-start", 50),
      createMapWithCoverage("amber-end", 89),
      createMapWithCoverage("green", 90),
    ];

    renderTable(maps);

    expect(screen.getByText("49%").className).toContain("text-destructive");
    expect(screen.getByText("50%").className).toContain("text-amber-500");
    expect(screen.getByText("89%").className).toContain("text-amber-500");
    expect(screen.getByText("90%").className).toContain("text-green-500");

    fireEvent.click(
      screen.getAllByRole("button", {
        name: "events.killDetail.mapCoverage.expandMap",
      })[0]!,
    );

    const expandedCoverage = screen.getAllByText("49%")[1];
    expect(expandedCoverage?.className).toContain("text-destructive");
  });

  it("groups repeated assignments and reveals every period without duplicate key warnings", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    renderTable([createMapWithRepeatedAssignment()]);

    expect(screen.getByText("Pradawne Wzgórze")).toBeTruthy();
    expect(
      screen.getAllByText("events.killDetail.mapCoverage.memberCount"),
    ).toHaveLength(2);

    const mapToggle = screen.getByRole("button", {
      name: "events.killDetail.mapCoverage.expandMap",
    });
    expect(mapToggle.className).toContain("size-11");
    expect(mapToggle.className).toContain("lg:size-9");
    expect(mapToggle.className).toContain("mr-1");
    expect(mapToggle.className).toContain("lg:mr-3");
    expect(mapToggle.className).toContain("text-muted-foreground");
    expect(mapToggle.className).not.toContain("rounded-none");
    expect(mapToggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(mapToggle);
    expect(mapToggle.getAttribute("aria-expanded")).toBe("true");
    expect(mapToggle.getAttribute("aria-controls")).toBe("map-map-1-details");

    const detail = document.getElementById("map-map-1-details");
    expect(detail?.getAttribute("aria-labelledby")).toBe("map-map-1-summary");
    expect(detail?.className).not.toContain("bg-muted");
    expect(detail?.closest("td")?.getAttribute("colspan")).toBe("5");
    expect(detail?.closest("tr")?.getAttribute("data-state")).toBe(
      "expanded-detail",
    );
    expect(detail?.closest("tr")?.className).not.toContain(
      "hover:bg-transparent",
    );
    const diagnostics = screen
      .getByText("events.killDetail.mapCoverage.covered")
      .closest("dl");
    expect(diagnostics?.className).toContain("border-b");
    expect(diagnostics?.className).not.toContain("border-y");

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
    expect(
      consoleError.mock.calls.some((call) =>
        call.some(
          (argument) =>
            typeof argument === "string" && argument.includes("same key"),
        ),
      ),
    ).toBe(false);

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
    expect(auditToggle.className).toContain("h-11");
    expect(auditToggle.className).toContain("md:h-8");
    fireEvent.click(auditToggle);
    expect(auditToggle.getAttribute("aria-expanded")).toBe("true");
    expect(auditToggle.className).toContain("h-11");
    expect(auditToggle.className).toContain("md:h-8");
    expect(
      screen.getByText("events.killDetail.mapCoverage.allGaps"),
    ).toBeTruthy();
    expect(screen.getByText("5m")).toBeTruthy();
  });

  it("keeps a long gap audit inside a fixed-height scroll area", () => {
    const map = createMapWithGaps();
    map.gaps = Array.from({ length: 66 }, (_, index) => {
      const startedAt = new Date(startTime.getTime() + index * 60_000);
      const endedAt = new Date(startedAt.getTime() + 10_000);

      return {
        id: `gap-${index}`,
        gapType: "UNCOVERED" as const,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds: 10,
      };
    });
    renderTable([map]);

    fireEvent.click(
      screen.getByRole("button", {
        name: "events.killDetail.mapCoverage.expandMap",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /events\.killDetail\.mapCoverage\.showAllGaps/,
      }),
    );

    const scrollArea = document.querySelector('[data-slot="scroll-area"]');
    expect(scrollArea?.className).toContain("h-60");
    expect(scrollArea?.className).not.toContain("max-h-60");
  });

  it("uses three visible columns below the md breakpoint", () => {
    installMatchMedia(true);
    renderTable([createMapWithRepeatedAssignment()]);

    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getAllByRole("cell")).toHaveLength(3);
    expect(screen.queryByText("#123")).toBeNull();
    const coverageCell = screen.getByText("100%").closest("td");
    expect(coverageCell?.className).toContain("w-16");
    expect(coverageCell?.className).toContain("px-0!");
    const actionCell = screen
      .getByRole("button", {
        name: "events.killDetail.mapCoverage.expandMap",
      })
      .closest("td");
    expect(actionCell?.className).toContain("w-12");
    expect(actionCell?.className).toContain("p-0!");
    const columnWidths = Array.from(document.querySelectorAll("col")).map(
      (column) => column.className,
    );
    expect(columnWidths).toEqual(["", "w-16 md:w-20", "w-12"]);
    fireEvent.click(
      screen.getByRole("button", {
        name: "events.killDetail.mapCoverage.expandMap",
      }),
    );
    expect(
      document
        .getElementById("map-map-1-details")
        ?.closest("td")
        ?.getAttribute("colspan"),
    ).toBe("3");
  });

  it("uses participant role colors for assigned members with a neutral fallback", () => {
    const map = createMapWithRepeatedAssignment();
    map.assignments.push({
      memberId: 8,
      memberName: "Bez roli",
      memberAvatar: null,
      memberUserId: "user-8",
      assignedAt: "2026-08-12T08:00:00.000Z",
      unassignedAt: "2026-08-12T08:15:00.000Z",
    });

    renderTable([map], new Map([[7, "#AABBCC"]]));
    fireEvent.click(
      screen.getByRole("button", {
        name: "events.killDetail.mapCoverage.expandMap",
      }),
    );

    expect(screen.getByText("Tester").getAttribute("style")).toContain(
      "color: #AABBCC",
    );
    expect(screen.getByText("Bez roli").getAttribute("style")).toBeNull();
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
      document
        .getElementById("map-map-1-details")
        ?.closest("tr")
        ?.getAttribute("data-state"),
    ).toBe("expanded-detail");
    expect(
      document.getElementById("map-map-1-details")?.className,
    ).not.toContain("bg-muted");
    expect(
      screen.queryByText("events.killDetail.mapCoverage.covered"),
    ).toBeNull();
  });
});

function renderTable(
  maps: MapTimelineData[],
  memberRoleColors: ReadonlyMap<number, string> = new Map(),
) {
  return render(
    <KillMapsTimelineTable
      maps={maps}
      startTime={startTime}
      endTime={endTime}
      memberRoleColors={memberRoleColors}
      t={t}
    />,
  );
}

function installMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(max-width: 767px)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function createMapWithRepeatedAssignment(): MapTimelineData {
  return {
    mapId: "map-1",
    mapName: "Pradawne Wzgórze",
    numericMapId: 123,
    assignments: [
      {
        memberId: 7,
        memberName: "Tester",
        memberAvatar: null,
        memberUserId: "user-7",
        assignedAt: "2026-08-12T08:00:00.000Z",
        unassignedAt: "2026-08-12T08:30:00.000Z",
      },
      {
        memberId: 7,
        memberName: "Tester",
        memberAvatar: null,
        memberUserId: "user-7",
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

function createMapWithCoverage(
  mapId: string,
  coveragePercent: number,
): MapTimelineData {
  const uncoveredSeconds = Math.round(
    ((100 - coveragePercent) / 100) * 2 * 60 * 60,
  );

  return {
    mapId,
    mapName: mapId,
    numericMapId: coveragePercent,
    assignments: [],
    gaps:
      uncoveredSeconds === 0
        ? []
        : [
            {
              id: `${mapId}-gap`,
              gapType: "UNCOVERED",
              startedAt: startTime.toISOString(),
              endedAt: new Date(
                startTime.getTime() + uncoveredSeconds * 1000,
              ).toISOString(),
              durationSeconds: uncoveredSeconds,
            },
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
