import { describe, expect, it } from "vitest";
import { docsTranslations } from "./polish-translations";

describe("Docs translations", () => {
  it("defines the shared document metadata", () => {
    expect(docsTranslations.metadata).toEqual({
      description:
        "Instrukcje instalacji, obsługi dodatku i panelu webowego Lootlog dla graczy Margonem.",
      title: "Dokumentacja Lootlog",
    });
  });

  it("defines the root redirect fallback copy", () => {
    expect(docsTranslations.redirect).toEqual({
      linkLabel: "dokumentacji Lootlog",
      prefix: "Przejdź do",
      suffix: ".",
    });
  });
});
