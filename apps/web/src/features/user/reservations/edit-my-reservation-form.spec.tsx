import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import {
  waitFor,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";

import { afterEach, describe, expect, it, vi } from "vitest";
import type { MyReservationsResponseDtoItemsItem } from "@lootlog/client/main";
import { EditMyReservationForm } from "./edit-my-reservation-form";

await initializeTestTranslations({
  "reservations.schedule.dialog.startDate": "Data rozpoczęcia",
  "reservations.schedule.dialog.startDatePlaceholder": "Wybierz początek",
  "reservations.schedule.dialog.endDate": "Data zakończenia",
  "reservations.schedule.dialog.endDatePlaceholder": "Wybierz koniec",
  "reservations.schedule.dialog.comment": "Komentarz",
  "reservations.schedule.dialog.commentPlaceholder": "Dodaj komentarz",
  "reservations.schedule.dialog.reminder": "Przypomnienie",
  "common.cancel": "Anuluj",
  "common.save": "Zapisz",
});

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
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("EditMyReservationForm", () => {
  it("submits the editable reservation fields through the typed update flow", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    const restore = configureApiClients({
      main: { baseUrl: "https://api.test" },
    });

    const updates: { url: string; body: string | null | undefined }[] = [];
    vi.stubGlobal(
      "fetch",
      async (input: string | URL | Request, init?: RequestInit) => {
        const request = new Request(input, init);

        if (request.method === "PATCH") {
          updates.push({ url: request.url, body: await request.text() });

          return Response.json(reservation);
        }

        return Response.json([
          { targetType: "DM", active: true, canSend: true },
        ]);
      },
    );
    const RouterWrapper = await createOrganizationTestWrapper();
    const onSuccess = vi.fn();
    render(
      <RouterWrapper>
        <QueryClientProvider client={client}>
          <EditMyReservationForm
            reservation={reservation}
            onCancel={vi.fn()}
            onSuccess={onSuccess}
          />
        </QueryClientProvider>
      </RouterWrapper>,
    );

    fireEvent.change(screen.getByLabelText("Komentarz"), {
      target: { value: "  Zmieniony komentarz  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(updates).toEqual([
      {
        url: "https://api.test/users/@me/reservations/42",
        body: JSON.stringify({
          startsAt: reservation.startsAt,
          endsAt: reservation.endsAt,
          comment: "Zmieniony komentarz",
          reminderMinutesBefore: 15,
        }),
      },
    ]);
    restore();
  });
});
