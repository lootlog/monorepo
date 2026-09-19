import { describe, expect, it } from "bun:test";
import { ErrorKey } from "./error-key.js";
import { parseVanityUrl } from "./vanity-url.js";

describe("parseVanityUrl", () => {
  it("stores the slugged form of an ordinary name", () => {
    expect(parseVanityUrl("Nazwa Klanu 2!")).toEqual({ slug: "nazwa-klanu-2" });
  });

  it.each(["123456789012345678", " 1234 ", "#42", "---", "!!!"])(
    "rejects %p because its slug is empty or could be an Organization id",
    (input) => {
      expect(parseVanityUrl(input)).toEqual({
        error: ErrorKey.GUILDS_VANITY_URL_INVALID,
      });
    },
  );

  it.each(["battles", "Battles", "battles!", " BATTLES "])(
    "rejects %p because its slug is a reserved route",
    (input) => {
      expect(parseVanityUrl(input)).toEqual({
        error: ErrorKey.GUILDS_VANITY_URL_RESTRICTED,
      });
    },
  );
});
