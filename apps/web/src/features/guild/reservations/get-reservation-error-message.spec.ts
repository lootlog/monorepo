import { ApiError, createApiClient } from "@lootlog/client/transport";
import i18next from "i18next";
import { describe, expect, it } from "vitest";
import reservations from "@/i18n/translations/reservations.json";
import { getReservationErrorMessage } from "./get-reservation-error-message";

const translations = i18next.createInstance();
await translations.init({
  lng: "pl",
  resources: { pl: { translation: { reservations } } },
});

const apiError = (data: unknown) =>
  new ApiError({
    data,
    message: "Unprocessable Entity",
    method: "POST",
    url: "/reservations",
    status: 422,
  });

describe("reservation error messages", () => {
  it("shows the reason and limit from a rejected reservation request", async () => {
    const client = createApiClient("main", {
      baseUrl: "https://api.example.test",
      fetch: async () =>
        Response.json(
          { code: "ACTIVE_LIMIT_REACHED", limit: 3 },
          { status: 422 },
        ),
    });
    const error = await client
      .post("/reservations", {})
      .catch((error: unknown) => error);
    expect(getReservationErrorMessage(error, translations.t)).toBe(
      "Osiągnięto limit aktywnych i przyszłych rezerwacji na tym expowisku (3). Anuluj istniejącą rezerwację lub poczekaj na jej zakończenie.",
    );
  });

  it.each([
    [{ code: "FORBIDDEN" }, "Nie masz uprawnień do wykonania tej operacji."],
    [
      { code: "GUILD_NOT_FOUND" },
      "Organizacja nie istnieje lub nie masz do niej dostępu.",
    ],
    [
      { code: "AUTHENTICATION_REQUIRED" },
      "Zaloguj się ponownie, aby wykonać tę operację.",
    ],
    [
      { code: "RESERVATION_WINDOW_TOO_LARGE" },
      "Można pobrać rezerwacje z okresu nie dłuższego niż 31 dni.",
    ],
    [
      { code: "RESERVATION_TOO_SHORT", minimumMinutes: 30 },
      "Rezerwacja musi trwać co najmniej 30 minut.",
    ],
    [
      { code: "RESERVATION_TOO_LONG", maximumMinutes: 180 },
      "Rezerwacja może trwać maksymalnie 180 minut.",
    ],
    [
      { code: "RESERVATION_TOO_FAR_IN_ADVANCE", maximumDays: 7 },
      "Rezerwację można utworzyć maksymalnie 7 dni do przodu.",
    ],
    [
      { code: "INVALID_TIME_GRID", granularityMinutes: 15 },
      "Początek i koniec muszą wypadać co 15 minut.",
    ],
    [
      { code: "RESERVATION_DELETE_FORBIDDEN" },
      "Nie masz uprawnień do usunięcia tej rezerwacji.",
    ],
    [
      { code: "RESERVATION_NOT_FOUND" },
      "Ta rezerwacja już nie istnieje lub jest niedostępna.",
    ],
    [
      { message: "RESERVATION_OVERLAP" },
      "Ten termin koliduje z rezerwacją Twojej organizacji.",
    ],
    [
      { code: "ACTIVE_LIMIT_REACHED", limit: "invalid" },
      "Osiągnięto limit aktywnych rezerwacji na tym expowisku.",
    ],
  ])("translates API reason %j", (data, expected) => {
    expect(getReservationErrorMessage(apiError(data), translations.t)).toBe(
      expected,
    );
  });

  it.each([
    null,
    { code: "UNKNOWN", message: "private backend details" },
    new Error("network failure"),
  ])("keeps an actionable fallback for unknown failures", (error) => {
    expect(getReservationErrorMessage(apiError(error), translations.t)).toBe(
      reservations.errors.unknown,
    );
  });
});
