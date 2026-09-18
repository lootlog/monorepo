import { describe, expect, it } from "bun:test";
import { ErrorKey } from "./error-key.js";
import { parseVanityUrl } from "./vanity-url.js";

describe("parseVanityUrl", () => {
  it("stores the slugged form of an ordinary name", () => {
    expect(parseVanityUrl("Nazwa Klanu!")).toEqual({ slug: "nazwa-klanu" });
  });

  it.each(["123456789012345678", " 1234 ", "---", "!!!"])(
    "rejects %p because its slug could impersonate an Organization id or is empty",
    (input) => {
      expect(parseVanityUrl(input)).toEqual({
        error: ErrorKey.GUILDS_VANITY_URL_INVALID,
      });
    },
  );

  it.each(["battles", "Battles", "battles!", "@me"])(
    "rejects %p because its slug is a reserved route",
    (input) => {
      expect(parseVanityUrl(input)).toEqual({
        error: ErrorKey.GUILDS_VANITY_URL_RESTRICTED,
      });
    },
  );
});
