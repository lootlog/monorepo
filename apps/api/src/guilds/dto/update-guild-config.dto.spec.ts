import { describe, expect, it } from "vitest";
import { ErrorKey } from "src/guilds/enum/error-key.enum";
import { UpdateGuildConfigDto } from "./update-guild-config.dto";

describe("UpdateGuildConfigDto", () => {
  it("returns a translation key instead of localized backend copy", () => {
    const result = UpdateGuildConfigDto.schema.safeParse({
      reservationTimeGranularityMinutes: 7,
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues[0]?.message).toBe(
      ErrorKey.GUILDS_RESERVATION_TIME_GRANULARITY_INVALID,
    );
  });
});
