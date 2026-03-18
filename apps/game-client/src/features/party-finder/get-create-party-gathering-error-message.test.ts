import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCreatePartyGatheringErrorMessage } from "./get-create-party-gathering-error-message";

describe("getCreatePartyGatheringErrorMessage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the forbidden message for 403 responses", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

    expect(
      getCreatePartyGatheringErrorMessage({
        response: { status: 403 },
      } as never),
    ).toBe("Brak uprawnień do wysyłania ogłoszeń");
  });

  it("returns the rate-limit message for 429 responses", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

    expect(
      getCreatePartyGatheringErrorMessage({
        response: { status: 429 },
      } as never),
    ).toBe("Zbyt wiele prób. Spróbuj za chwilę.");
  });

  it("returns the backend message for 400 responses when available", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

    expect(
      getCreatePartyGatheringErrorMessage({
        response: {
          status: 400,
          data: { message: "Opis jest za długi" },
        },
      } as never),
    ).toBe("Opis jest za długi");
  });

  it("falls back to the default message for non-Axios errors", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(false);

    expect(getCreatePartyGatheringErrorMessage(new Error("boom"))).toBe(
      "Nie udało się utworzyć ogłoszenia",
    );
  });
});
