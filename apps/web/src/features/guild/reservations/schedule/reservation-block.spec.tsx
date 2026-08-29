// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationBlock } from "./reservation-block";
import type { ReservationSegment } from "./types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      `${key}:${String(options?.name ?? options?.organization ?? "")}`,
  }),
}));

afterEach(cleanup);

const createSegment = (
  durationMinutes: number,
  displayName: string,
  isCurrent = true,
  laneCount = isCurrent ? 1 : 2,
): ReservationSegment => {
  const startsAt = new Date("2026-08-26T10:00:00.000Z");
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  return {
    id: String(durationMinutes),
    dayIdx: 0,
    startHour: 10,
    durationHours: durationMinutes / 60,
    segmentStart: startsAt,
    segmentEnd: endsAt,
    isReservationStart: true,
    lane: laneCount === 1 ? 0 : 1,
    laneCount,
    reservation: {
      id: durationMinutes,
      spotId: "potepione-zamczysko",
      spotName: "Potępione Zamczysko",
      startsAt,
      endsAt,
      createdAt: startsAt,
      comment: "Komentarz",
      author: { displayName, avatarUrl: null },
      sourceOrganization: {
        name: isCurrent ? "Zgarbieni" : "Gildia partnerska",
        iconUrl: null,
        isCurrent,
        calendarPath: "/zgarbieni/reservations/potepione-zamczysko",
      },
      isMine: isCurrent,
      canEdit: isCurrent,
      canCancel: isCurrent,
      editingConstraints: {
        reservationMaxDurationMinutes: 180,
        reservationMinDurationMinutes: 30,
        reservationTimeGranularityMinutes: 15,
        reservationMaxAdvanceDays: 7,
      },
      reminderMinutesBefore: null,
    },
  };
};

describe("ReservationBlock", () => {
  it.each([
    [30, "size-4", true],
    [60, "size-4", true],
    [90, "size-6", false],
  ] as const)(
    "uses the responsive avatar treatment for a %i minute reservation",
    (durationMinutes, sizeClassName, isCompact) => {
      const { container } = render(
        <ReservationBlock
          segment={createSegment(durationMinutes, "Alderaan")}
          onSelect={vi.fn()}
        />,
      );
      const avatar = container.querySelector(
        '[data-slot="reservation-avatar"]',
      );

      expect(avatar).not.toBeNull();
      expect(avatar?.className).toContain(sizeClassName);
      expect(avatar?.className.split(" ").includes("hidden")).toBe(isCompact);
      if (isCompact) {
        expect(avatar?.className).toContain("@min-[7rem]:flex");
      }
    },
  );

  it.each([30, 60, 120])(
    "keeps the nickname visible for a %i minute reservation",
    (durationMinutes) => {
      render(
        <ReservationBlock
          segment={createSegment(durationMinutes, "Alderaan")}
          onSelect={vi.fn()}
        />,
      );
      expect(screen.getByText("Alderaan")).not.toBeNull();
    },
  );

  it("shows the time beside the nickname for a short full-width reservation", () => {
    render(
      <ReservationBlock
        segment={createSegment(30, "Alderaan")}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText(/^\d{2}:\d{2}–\d{2}:\d{2}$/)).not.toBeNull();
  });

  it("restores reservation actions in the context menu", () => {
    const onCancel = vi.fn();
    const onSelect = vi.fn();
    render(
      <ReservationBlock
        segment={createSegment(60, "Alderaan")}
        onSelect={onSelect}
        onCancel={onCancel}
      />,
    );

    fireEvent.contextMenu(screen.getByRole("button"));
    expect(screen.getByText("reservations.details.title:")).not.toBeNull();
    fireEvent.click(screen.getByText("reservations.details.cancel:"));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("hides the time when a short reservation shares a narrow lane", () => {
    render(
      <ReservationBlock
        segment={createSegment(30, "Alderaan", true, 2)}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByText(/^\d{2}:\d{2}–\d{2}:\d{2}$/)).toBeNull();
  });

  it("keeps a long Unicode partner nickname in the accessible block", () => {
    const onSelect = vi.fn();
    const nickname = "Łowczyni_Żółwi_🐢_Bardzo_Długi_Nick";
    render(
      <ReservationBlock
        segment={createSegment(30, nickname, false)}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText(nickname)).not.toBeNull();
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toContain(nickname);
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
