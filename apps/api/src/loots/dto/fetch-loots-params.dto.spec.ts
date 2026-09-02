import { describe, expect, it } from "#test/bun-test";
import { FetchLootsParamsDto } from "./fetch-loots-params.dto.js";

describe("FetchLootsParamsDto", () => {
  it.each([
    { input: undefined, expected: undefined },
    { input: "", expected: undefined },
    { input: "42", expected: 42 },
  ])(
    "parses an optional numeric query value from $input",
    ({ input, expected }) => {
      const result = FetchLootsParamsDto.schema.parse({ cursor: input });

      expect(result.cursor).toBe(expected);
    },
  );
});
