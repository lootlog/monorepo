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
});
