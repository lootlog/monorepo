import { describe, expect, it } from "bun:test";
import { readGameAccountId } from "./margonem-account.js";

describe("readGameAccountId", () => {
  it("takes the account from a profile link, not the character in its fragment", () => {
    expect(
      readGameAccountId(
        " https://www.margonem.pl/profile/view,10145667#char_36132,luvia ",
      ),
    ).toBe("10145667");
  });

  it("accepts a bare account id", () => {
    expect(readGameAccountId("10145667")).toBe("10145667");
  });

  it.each([
    "https://www.margonem.pl/profile/view,0123",
    "https://www.margonem.pl/",
    "char_36132",
    "",
  ])("names no account for %p", (input) => {
    expect(readGameAccountId(input)).toBeUndefined();
  });
});
