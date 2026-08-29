import "../../i18n/config";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TranslatedItemStat } from "./translated-item-stat";

describe("TranslatedItemStat", () => {
  it("renders nested legendary bonus markup from the shared dictionary", () => {
    const markup = renderToStaticMarkup(
      <TranslatedItemStat
        displayValue={{ key: "legbon.retaliation", value: 16 }}
      />,
    );

    expect(markup).toContain("Aura odwetu");
    expect(markup).toContain("text-green-500");
    expect(markup).toContain("font-bold text-primary");
    expect(markup).not.toContain("&lt;value&gt;");
  });
});
