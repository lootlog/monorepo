import { describe, expect, it } from "vitest";
import { getRecentWorldGroups } from "./world-combobox";

describe("getRecentWorldGroups", () => {
  it("lists recent worlds still available first and does not repeat them", () => {
    const groups = getRecentWorldGroups(
      ["aldous", "berufs", "tempest"],
      ["tempest", "gone", "aldous"],
      { recent: "Ostatnio", rest: "Światy" },
    );

    expect(
      groups.map(({ label, items }) => [
        label,
        items.map(({ value }) => value),
      ]),
    ).toEqual([
      ["Ostatnio", ["tempest", "aldous"]],
      ["Światy", ["berufs"]],
    ]);
  });
});
