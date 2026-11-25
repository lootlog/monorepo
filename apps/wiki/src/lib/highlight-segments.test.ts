import { describe, expect, test } from "vitest";
import { highlightSegments } from "./highlight-segments";

const marked = (text: string, query: string) =>
  highlightSegments(text, query)
    .filter((segment) => segment.marked)
    .map((segment) => segment.text);

describe("highlightSegments", () => {
  test("marks Polish letters typed without diacritics and in any case", () => {
    expect(marked("Łuk łowcy skór", "luk LOWCY skor")).toEqual([
      "Łuk",
      "łowcy",
      "skór",
    ]);
    expect(marked("Rękawice mrozu", "ręka")).toEqual(["Ręka"]);
  });

  test("keeps the text whole and unmarked without a query", () => {
    expect(highlightSegments("Łuk", "  ")).toEqual([
      { text: "Łuk", marked: false },
    ]);
  });
});
