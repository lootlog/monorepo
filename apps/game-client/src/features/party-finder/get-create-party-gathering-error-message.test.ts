import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@lootlog/client/transport";
import { ActivePartyGatheringError } from "./active-party-gathering-error";
import { getCreatePartyGatheringErrorMessage } from "./get-create-party-gathering-error-message";

const createApiError = (status?: number, data?: unknown) =>
  new ApiError({
    status,
    data,
    url: "https://lootlog.local/messaging/party-gathering",
    method: "POST",
    message: "Request failed",
  });

describe("getCreatePartyGatheringErrorMessage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the forbidden message for 403 responses", () => {
    expect(getCreatePartyGatheringErrorMessage(createApiError(403))).toBe(
      "Brak uprawnień do wysyłania ogłoszeń",
    );
  });

  it("returns the rate-limit message for 429 responses", () => {
    expect(getCreatePartyGatheringErrorMessage(createApiError(429))).toBe(
      "Zbyt wiele prób. Spróbuj za chwilę.",
    );
  });

  it("returns the backend message for 400 responses when available", () => {
    expect(
      getCreatePartyGatheringErrorMessage(
        createApiError(400, { message: "Opis jest za długi" }),
      ),
    ).toBe("Opis jest za długi");
  });

  it("explains an existing organizer room", () => {
    expect(
      getCreatePartyGatheringErrorMessage(
        createApiError(409, { code: "ACTIVE_GATHERING_EXISTS" }),
      ),
    ).toBe("Masz już aktywną zbiórkę grupy");
  });

  it("explains an active gathering detected locally", () => {
    expect(
      getCreatePartyGatheringErrorMessage(
        new ActivePartyGatheringError("room-1"),
      ),
    ).toBe("Masz już aktywną zbiórkę grupy");
  });

  it("explains a character occupied by another room", () => {
    expect(
      getCreatePartyGatheringErrorMessage(
        createApiError(409, { code: "ALREADY_JOINED_ELSEWHERE" }),
      ),
    ).toBe("Ta postać jest już w innym Ready Roomie");
  });

  it("falls back to the default message for non-API errors", () => {
    expect(getCreatePartyGatheringErrorMessage(new Error("boom"))).toBe(
      "Nie udało się utworzyć ogłoszenia",
    );
  });
});
