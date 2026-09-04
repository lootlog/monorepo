import { describe, expect, it } from "bun:test";
import { ErrorKey } from "#src/guilds/error-key";
import { UpdateOrganizationConfigRequest } from "#src/contracts/guilds/schemas";
import { Result, Schema } from "effect";

describe("UpdateOrganizationConfigRequest", () => {
  it("returns a translation key instead of localized backend copy", () => {
    const result = Schema.decodeUnknownResult(UpdateOrganizationConfigRequest)({
      reservationTimeGranularityMinutes: 7,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(String(result.failure)).toContain(
      ErrorKey.GUILDS_RESERVATION_TIME_GRANULARITY_INVALID,
    );
  });
});
