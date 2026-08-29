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
    expect(markup).toContain("block w-full text-green-500");
    expect(markup).toContain("font-bold text-primary");
    expect(markup).not.toContain("&lt;value&gt;");
  });

  it("does not group digits in formatted dates", () => {
    const markup = renderToStaticMarkup(
      <TranslatedItemStat
        displayValue={{ key: "expire_date", value: "01.01.2026, 01:00" }}
      />,
    );

    expect(markup).toContain("01.01.2026, 01:00");
    expect(markup).not.toContain("2 026");
  });

  it("still groups numeric stat values", () => {
    const markup = renderToStaticMarkup(
      <TranslatedItemStat displayValue={{ key: "hp", value: "12345" }} />,
    );

    expect(markup).toContain("12 345");
  });

  it("renders etiquette with the item description typography", () => {
    const markup = renderToStaticMarkup(
      <TranslatedItemStat
        displayValue={{ key: "etiquette", value: "Wakacje 2026 r." }}
      />,
    );

    expect(markup).toContain("text-center text-muted-foreground");
    expect(markup).toContain("Ostatnio dostępny podczas:");
  });
});
