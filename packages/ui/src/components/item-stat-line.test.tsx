import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ItemStatLine } from "./item-stat-line";

describe("ItemStatLine", () => {
  it("renders shared templates with safe semantic markup", () => {
    const markup = renderToStaticMarkup(
      <ItemStatLine displayValue={{ key: "legbon.retaliation", value: 16 }} />,
    );

    expect(markup).toContain("Aura odwetu");
    expect(markup).not.toContain("<legbon>");
  });

  it("interpolates ordered list values", () => {
    const markup = renderToStaticMarkup(
      <ItemStatLine
        displayValue={{
          key: "teleport",
          value: ["id", "12", "34", "Tuzmer"],
        }}
      />,
    );

    expect(markup).toContain("Tuzmer (12, 34)");
  });

  it("resolves namespaced value translations from the shared dictionary", () => {
    const markup = renderToStaticMarkup(
      <ItemStatLine
        displayValue={{
          key: "target_rarity",
          translateKey: "itemStats.rarity",
          value: ["heroic"],
        }}
      />,
    );

    expect(markup).toContain("Heroiczny");
    expect(markup).not.toContain(">heroic<");
  });

  it("does not group digits in formatted dates", () => {
    const markup = renderToStaticMarkup(
      <ItemStatLine
        displayValue={{
          key: "expire_date",
          value: "01.01.2026, 01:00",
        }}
      />,
    );

    expect(markup).toContain("01.01.2026, 01:00");
    expect(markup).not.toContain("2 026");
  });

  it("still groups numeric stat values", () => {
    const markup = renderToStaticMarkup(
      <ItemStatLine displayValue={{ key: "hp", value: "12345" }} />,
    );

    expect(markup).toContain("12 345");
  });
});
