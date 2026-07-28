// @vitest-environment happy-dom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventParticipationConfirmationDialog } from "./event-participation-confirmation-dialog";

const mocks = vi.hoisted(() => ({
  acknowledgeExpired: vi.fn(),
  confirmParticipation: vi.fn(),
  data: {
    items: [] as Array<ReturnType<typeof createConfirmation>>,
    expiredItems: [] as Array<ReturnType<typeof createConfirmation>>,
  },
  invalidateQueries: vi.fn(),
  listeners: new Set<() => void>(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@lootlog/api-client/react-query/main/events", () => ({
  getListPendingParticipationConfirmationsQueryKey: () => [
    "participation-confirmations",
  ],
  useAcknowledgeExpiredParticipationConfirmations: () => ({
    isPending: false,
    mutateAsync: mocks.acknowledgeExpired,
  }),
  useConfirmParticipationForKill: () => ({
    isPending: false,
    mutateAsync: mocks.confirmParticipation,
  }),
  useListPendingParticipationConfirmations: () => {
    const data = useSyncExternalStore(
      (listener) => {
        mocks.listeners.add(listener);
        return () => mocks.listeners.delete(listener);
      },
      () => mocks.data,
    );

    return {
      data,
      isLoading: false,
    };
  },
}));

describe("EventParticipationConfirmationDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-07-28T12:00:00.000Z");
    vi.clearAllMocks();
    mocks.data = {
      items: [],
      expiredItems: [],
    };
    mocks.listeners.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows an expired confirmation and acknowledges it after dismissal", () => {
    mocks.data.expiredItems = [
      createConfirmation({
        killId: "expired-kill",
        confirmationDeadlineAt: "2026-07-28T11:59:59.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    expect(screen.getByText("Przeterminowane potwierdzenia")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(mocks.acknowledgeExpired).toHaveBeenCalledWith({
      pathParams: {
        guildId: "guild-1",
        eventId: "event-1",
      },
      data: {
        killIds: ["expired-kill"],
      },
    });
  });

  it("shows and acknowledges a stale pending response whose deadline has passed", () => {
    mocks.data.items = [
      createConfirmation({
        killId: "stale-pending-kill",
        confirmationDeadlineAt: "2026-07-28T11:59:59.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    expect(screen.getByText("Przeterminowane potwierdzenia")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(mocks.acknowledgeExpired).toHaveBeenCalledWith({
      pathParams: {
        guildId: "guild-1",
        eventId: "event-1",
      },
      data: {
        killIds: ["stale-pending-kill"],
      },
    });
  });

  it("shows expiration feedback when the last active confirmation expires", () => {
    mocks.data.items = [
      createConfirmation({
        killId: "active-kill",
        confirmationDeadlineAt: "2026-07-28T12:00:01.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1_001);
    });

    expect(screen.getByText("Przeterminowane potwierdzenia")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(mocks.acknowledgeExpired).toHaveBeenCalledWith({
      pathParams: {
        guildId: "guild-1",
        eventId: "event-1",
      },
      data: {
        killIds: ["active-kill"],
      },
    });
  });

  it("keeps a confirmation actionable at its exact deadline", () => {
    mocks.data.items = [
      createConfirmation({
        killId: "deadline-kill",
        confirmationDeadlineAt: "2026-07-28T12:00:00.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    expect(screen.getByRole("button", { name: "Potwierdź" })).toBeTruthy();
  });

  it("shows expired feedback alongside a new active confirmation without submitting expired kills", () => {
    mocks.data.items = [
      createConfirmation({
        killId: "active-kill",
        confirmationDeadlineAt: "2026-07-28T12:01:00.000Z",
      }),
      createConfirmation({
        killId: "newly-expired-kill",
        confirmationDeadlineAt: "2026-07-28T11:59:59.000Z",
      }),
    ];
    mocks.data.expiredItems = [
      createConfirmation({
        killId: "expired-kill",
        confirmationDeadlineAt: "2026-07-28T11:58:00.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Przeterminowane potwierdzenia")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Potwierdź" })).toHaveLength(
      1,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Potwierdź wszystko",
      }),
    );

    expect(mocks.confirmParticipation).toHaveBeenCalledTimes(1);
    expect(mocks.confirmParticipation).toHaveBeenCalledWith({
      pathParams: {
        guildId: "guild-1",
        eventId: "event-1",
        killId: "active-kill",
      },
    });
  });

  it("allows a future active confirmation after expired feedback is dismissed", () => {
    mocks.data.expiredItems = [
      createConfirmation({
        killId: "expired-kill",
        confirmationDeadlineAt: "2026-07-28T11:59:59.000Z",
      }),
    ];

    render(
      <EventParticipationConfirmationDialog
        guildId="guild-1"
        eventId="event-1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    mocks.data = {
      expiredItems: [],
      items: [
        createConfirmation({
          killId: "future-active-kill",
          confirmationDeadlineAt: "2026-07-28T12:01:00.000Z",
        }),
      ],
    };
    act(() => {
      for (const listener of mocks.listeners) {
        listener();
      }
    });

    expect(screen.getByRole("button", { name: "Potwierdź" })).toBeTruthy();
  });
});

function createConfirmation({
  killId,
  confirmationDeadlineAt,
}: {
  killId: string;
  confirmationDeadlineAt: string;
}) {
  return {
    killId,
    killedAt: "2026-07-28T11:55:00.000Z",
    confirmationDeadlineAt,
    heroNpc: {
      id: "hero-1",
      npcId: 123,
      npcName: "Potulny Berserker",
      npcIcon: null,
      npcLvl: 284,
    },
  };
}
