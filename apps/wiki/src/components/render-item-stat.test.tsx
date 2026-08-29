import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderItemStat } from "./render-item-stat";

describe("renderItemStat", () => {
  it("renders shared templates with safe semantic markup", () => {
    const markup = renderToStaticMarkup(
      <>{renderItemStat({ key: "legbon.retaliation", value: 16 })}</>,
    );

    expect(markup).toContain("Aura odwetu");
    expect(markup).toContain("text-green-500");
    expect(markup).toContain("font-bold text-primary");
    expect(markup).not.toContain("<legbon>");
  });

  it("interpolates ordered list values", () => {
    const markup = renderToStaticMarkup(
      <>
        {renderItemStat({
          key: "teleport",
          value: ["id", "12", "34", "Tuzmer"],
        })}
      </>,
    );

    expect(markup).toContain("Tuzmer (12, 34)");
  });

  it("resolves namespaced value translations from the shared dictionary", () => {
    const markup = renderToStaticMarkup(
      <>
        {renderItemStat({
          key: "target_rarity",
          translateKey: "itemStats.rarity",
          value: ["heroic"],
        })}
      </>,
    );

    expect(markup).toContain("heroiczny");
    expect(markup).not.toContain(">heroic<");
  });

  it("does not group digits in formatted dates", () => {
    const markup = renderToStaticMarkup(
      <>
        {renderItemStat({
          key: "expire_date",
          value: "01.01.2026, 01:00",
        })}
      </>,
    );

    expect(markup).toContain("01.01.2026, 01:00");
    expect(markup).not.toContain("2 026");
  });

  it("still groups numeric stat values", () => {
    const markup = renderToStaticMarkup(
      <>{renderItemStat({ key: "hp", value: "12345" })}</>,
    );

    expect(markup).toContain("12 345");
  });
});
