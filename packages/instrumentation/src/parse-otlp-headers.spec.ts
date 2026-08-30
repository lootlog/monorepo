import { describe, expect, it } from "vitest";
import { parseOtlpHeaders } from "./parse-otlp-headers.js";

describe("parseOtlpHeaders", () => {
  it("returns no headers when the variable is absent", () => {
    expect(parseOtlpHeaders()).toEqual({});
  });

  it("parses comma-separated OTLP headers", () => {
    expect(
      parseOtlpHeaders("authorization=Bearer%20token,x-scope=prod"),
    ).toEqual({
      authorization: "Bearer token",
      "x-scope": "prod",
    });
  });
});
