// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReservationsSchedule } from "./reservations-schedule";

const mocks = vi.hoisted(() => ({
  fetchQuery: vi.fn(),
  getListSpotReservationsQueryOptions: vi.fn(),
  keepPreviousData: vi.fn(),
  listSpotReservations: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: mocks.keepPreviousData,
  useQueryClient: () => ({
    fetchQuery: mocks.fetchQuery,
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ reservationId: "driady" }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    info: mocks.toastInfo,
    success: vi.fn(),
  },
}));

vi.mock("@lootlog/api-client/react-query/main/reservations", () => ({
  getListReservationSpotsQueryKey: vi.fn(() => ["reservation-spots"]),
  getListSpotReservationsQueryKey: vi.fn(() => ["spot-reservations"]),
  getListSpotReservationsQueryOptions: (
    path: { guildId: string; spotId: string },
    params: { from: string; to: string },
  ) => {
    mocks.getListSpotReservationsQueryOptions(path, params);
    return { queryKey: ["nearest-free-slot", path, params] };
  },
  useDeleteReservation: () => ({
    isPending: false,
    mutate: vi.fn(),
    variables: undefined,
  }),
  useListSpotReservations: (...args: unknown[]) => {
    mocks.listSpotReservations(...args);
    return {
      data: { items: [] },
      isError: false,
      isPending: false,
    };
  },
}));

vi.mock("@lootlog/api-client/react-query/main/guilds", () => ({
  useGuildsControllerGetGuildById: () => ({
    data: {
      reservationActiveLimitPerSpot: 3,
      reservationMaxAdvanceDays: 7,
      reservationMaxDurationMinutes: 180,
      reservationMinDurationMinutes: 30,
      reservationTimeGranularityMinutes: 15,
    },
  }),
}));

vi.mock("@/hooks/api/use-guild-permissions", () => ({
  useGuildPermissions: () => ({
    data: { allows: () => false, allowsAny: () => false },
  }),
}));
vi.mock("@/hooks/context/use-guild-id", () => ({
  useGuildId: () => "guild-1",
}));
vi.mock("@/hooks/context/use-is-owner", () => ({
  useIsOwner: () => true,
}));
vi.mock("@/hooks/utils/use-gateway", () => ({
  useGateway: () => ({
    connected: false,
    socket: { off: vi.fn(), on: vi.fn() },
  }),
}));
vi.mock("./use-compact-schedule-layout", () => ({
  useCompactScheduleLayout: () => ({
    containerRef: { current: null },
    isCompact: true,
  }),
}));

vi.mock("./schedule-header", () => ({
  ScheduleHeader: ({
    date,
    isFindingNearestFreeSlot,
    onFindNearestFreeSlot,
  }: {
    date: Date;
    isFindingNearestFreeSlot: boolean;
    onFindNearestFreeSlot: () => void;
  }) => (
    <div data-testid="schedule-header" data-date={date.toISOString()}>
      <button
        type="button"
        disabled={isFindingNearestFreeSlot}
        onClick={onFindNearestFreeSlot}
      >
        find-nearest
      </button>
    </div>
  ),
}));
vi.mock("./mobile-day-schedule", () => ({
  MobileDaySchedule: ({
    onDaySwipe,
  }: {
    onDaySwipe: (direction: -1 | 1) => void;
  }) => (
    <>
      <button type="button" onClick={() => onDaySwipe(-1)}>
        swipe-previous
      </button>
      <button type="button" onClick={() => onDaySwipe(1)}>
        swipe-next
      </button>
    </>
  ),
}));
vi.mock("./desktop-week-schedule", () => ({ DesktopWeekSchedule: () => null }));
vi.mock("./reservation-details", () => ({ ReservationDetails: () => null }));
vi.mock("./reservation-form-dialog", () => ({
  ReservationFormDialog: ({
    initialEndsAt,
    initialStartsAt,
    open,
  }: {
    initialEndsAt?: Date;
    initialStartsAt?: Date;
    open: boolean;
  }) => (
    <div
      data-testid="reservation-form-dialog"
      data-open={open}
      data-starts-at={initialStartsAt?.toISOString()}
      data-ends-at={initialEndsAt?.toISOString()}
    />
  ),
}));

describe("ReservationsSchedule nearest free slot", () => {
  const now = new Date(2026, 0, 1, 12, 7, 30, 0);

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(now);
    mocks.fetchQuery.mockReset();
    mocks.getListSpotReservationsQueryOptions.mockReset();
    mocks.listSpotReservations.mockReset();
    mocks.toastError.mockReset();
    mocks.toastInfo.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("ignores partner reservations while finding the nearest local range", async () => {
    mocks.fetchQuery.mockResolvedValue({
      items: [
        {
          endsAt: new Date(2026, 0, 2, 9, 0).toISOString(),
          sourceOrganization: { isCurrent: false },
          startsAt: new Date(2026, 0, 1, 12, 0).toISOString(),
        },
        {
          endsAt: new Date(2026, 0, 1, 13, 0).toISOString(),
          sourceOrganization: { isCurrent: true },
          startsAt: new Date(2026, 0, 1, 12, 30).toISOString(),
        },
      ],
    });
    render(<ReservationsSchedule />);

    fireEvent.click(screen.getByRole("button", { name: "find-nearest" }));

    await waitFor(() => expect(mocks.fetchQuery).toHaveBeenCalledOnce());
    expect(mocks.getListSpotReservationsQueryOptions).toHaveBeenCalledWith(
      { guildId: "guild-1", spotId: "driady" },
      {
        from: new Date(2026, 0, 1, 12, 15).toISOString(),
        to: new Date(2026, 0, 8, 12, 30).toISOString(),
      },
    );
    await waitFor(() =>
      expect(
        screen.getByTestId("reservation-form-dialog").getAttribute("data-open"),
      ).toBe("true"),
    );
    expect(
      screen.getByTestId("schedule-header").getAttribute("data-date"),
    ).toBe(new Date(2026, 0, 1, 13, 0).toISOString());
    expect(
      screen
        .getByTestId("reservation-form-dialog")
        .getAttribute("data-starts-at"),
    ).toBe(new Date(2026, 0, 1, 13, 0).toISOString());
    expect(
      screen
        .getByTestId("reservation-form-dialog")
        .getAttribute("data-ends-at"),
    ).toBe(new Date(2026, 0, 1, 13, 30).toISOString());
  });

  it("shows distinct feedback for no availability and request failures", async () => {
    const unavailableUntil = new Date(2026, 0, 8, 13, 0);
    mocks.fetchQuery
      .mockResolvedValueOnce({
        items: [
          {
            endsAt: unavailableUntil.toISOString(),
            sourceOrganization: { isCurrent: true },
            startsAt: now.toISOString(),
          },
        ],
      })
      .mockRejectedValueOnce(new Error("offline"));
    render(<ReservationsSchedule />);

    fireEvent.click(screen.getByRole("button", { name: "find-nearest" }));
    await waitFor(() => expect(mocks.toastInfo).toHaveBeenCalledOnce());
    expect(mocks.toastInfo).toHaveBeenCalledWith(
      "reservations.schedule.nearestFreeSlot.unavailable",
    );
    expect(
      screen.getByTestId("reservation-form-dialog").getAttribute("data-open"),
    ).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "find-nearest" }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledOnce());
    expect(mocks.toastError).toHaveBeenCalledWith(
      "reservations.schedule.nearestFreeSlot.error",
    );
  });

  it("prevents duplicate availability requests while one is pending", async () => {
    let resolveRequest:
      | ((result: {
          items: Array<{ endsAt: string; startsAt: string }>;
        }) => void)
      | undefined;
    mocks.fetchQuery.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<ReservationsSchedule />);
    const action = screen.getByRole("button", { name: "find-nearest" });

    fireEvent.click(action);
    fireEvent.click(action);

    expect(mocks.fetchQuery).toHaveBeenCalledOnce();
    expect(action.hasAttribute("disabled")).toBe(true);
    resolveRequest?.({ items: [] });
    await waitFor(() => expect(action.hasAttribute("disabled")).toBe(false));
  });

  it("moves exactly one day on swipe and keeps prior week data available", () => {
    render(<ReservationsSchedule />);

    fireEvent.click(screen.getByRole("button", { name: "swipe-next" }));
    expect(
      screen.getByTestId("schedule-header").getAttribute("data-date"),
    ).toBe(new Date(2026, 0, 2, 12, 7, 30).toISOString());
    fireEvent.click(screen.getByRole("button", { name: "swipe-previous" }));
    expect(
      screen.getByTestId("schedule-header").getAttribute("data-date"),
    ).toBe(now.toISOString());

    const queryCalls = mocks.listSpotReservations.mock.calls;
    const latestQueryOptions = queryCalls[queryCalls.length - 1]?.[2];
    expect(latestQueryOptions).toEqual({
      query: {
        enabled: true,
        placeholderData: mocks.keepPreviousData,
        staleTime: 15_000,
      },
    });
  });

  it("requests the adjacent week after swiping across its boundary", () => {
    render(<ReservationsSchedule />);
    const nextDay = screen.getByRole("button", { name: "swipe-next" });

    fireEvent.click(nextDay);
    fireEvent.click(nextDay);
    fireEvent.click(nextDay);
    fireEvent.click(nextDay);

    expect(
      screen.getByTestId("schedule-header").getAttribute("data-date"),
    ).toBe(new Date(2026, 0, 5, 12, 7, 30).toISOString());
    const queryCalls = mocks.listSpotReservations.mock.calls;
    const latestQueryParams = queryCalls[queryCalls.length - 1]?.[1];
    expect(latestQueryParams).toEqual({
      from: new Date(2026, 0, 4).toISOString(),
      to: new Date(2026, 0, 13).toISOString(),
    });
  });
});
