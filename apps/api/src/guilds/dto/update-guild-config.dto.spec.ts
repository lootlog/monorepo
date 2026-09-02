import { describe, expect, it } from "#test/bun-test";
import { ErrorKey } from "#src/guilds/enum/error-key.enum";
import { UpdateGuildConfigDto } from "#src/http-api/lootlog-api";
import { Result, Schema } from "effect";

describe("UpdateGuildConfigDto", () => {
  it("returns a translation key instead of localized backend copy", () => {
    const result = Schema.decodeUnknownResult(UpdateGuildConfigDto)({
      reservationTimeGranularityMinutes: 7,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(String(result.failure)).toContain(
      ErrorKey.GUILDS_RESERVATION_TIME_GRANULARITY_INVALID,
    );
  });
});
