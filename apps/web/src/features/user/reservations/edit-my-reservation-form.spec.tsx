// @vitest-environment happy-dom

import type { ComponentProps, ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MyReservationsResponseDtoItemsItem } from "@lootlog/client/main";
import { EditMyReservationForm } from "./edit-my-reservation-form";

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn<(options: unknown) => Promise<void>>(),
  mutate: vi.fn<(options: unknown) => void>(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  getListMyReservationsQueryKey: () => ["my-reservations"],
  useUpdateMyReservation: () => ({
    isPending: false,
    mutate: mocks.mutate,
  }),
  useNotificationsUserControllerGetUserTargets: () => ({
    data: [
      {
        targetType: "DM",
        active: true,
        canSend: true,
      },
    ],
    isSuccess: true,
  }),
}));

vi.mock("@lootlog/ui/components/date-time-picker", () => ({
  DateTimePicker: ({
    value,
    placeholder,
  }: {
    value?: Date;
    placeholder: string;
  }) => (
    <input
      aria-label={placeholder}
      value={value?.toISOString() ?? ""}
      readOnly
    />
  ),
}));

vi.mock("@lootlog/ui/components/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "reservations.schedule.dialog.startDate": "Data rozpoczęcia",
        "reservations.schedule.dialog.startDatePlaceholder": "Wybierz początek",
        "reservations.schedule.dialog.endDate": "Data zakończenia",
        "reservations.schedule.dialog.endDatePlaceholder": "Wybierz koniec",
        "reservations.schedule.dialog.comment": "Komentarz",
        "reservations.schedule.dialog.commentPlaceholder": "Dodaj komentarz",
        "reservations.schedule.dialog.reminder": "Przypomnienie",
        "common.cancel": "Anuluj",
        "common.save": "Zapisz",
      };
      return translations[key] ?? key;
    },
  }),
}));

const reservation: MyReservationsResponseDtoItemsItem = {
  id: 42,
  spotId: "potepione-zamczysko",
  spotName: "Potępione Zamczysko",
  startsAt: "2026-08-26T12:30:00.000Z",
  endsAt: "2026-08-26T13:30:00.000Z",
  comment: "Pierwszy komentarz",
  createdAt: "2026-08-25T12:00:00.000Z",
  author: { displayName: "Wild", avatarUrl: null },
  sourceOrganization: {
    name: "ZGARBIENI",
    iconUrl: null,
    isCurrent: true,
    calendarPath: "/zgarbieni/reservations/potepione-zamczysko",
  },
  isMine: true,
  canEdit: true,
  canCancel: true,
  editingConstraints: {
    reservationMaxDurationMinutes: 180,
    reservationMinDurationMinutes: 30,
    reservationTimeGranularityMinutes: 15,
    reservationMaxAdvanceDays: 7,
  },
  reminderMinutesBefore: 15,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("EditMyReservationForm", () => {
  it("submits the editable reservation fields through the typed update flow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));
    render(
      <EditMyReservationForm
        reservation={reservation}
        onCancel={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Komentarz"), {
      target: { value: "  Zmieniony komentarz  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    expect(mocks.mutate).toHaveBeenCalledWith({
      pathParams: { reservationId: 42 },
      data: {
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
        comment: "Zmieniony komentarz",
        reminderMinutesBefore: 15,
      },
    });
  });
});
