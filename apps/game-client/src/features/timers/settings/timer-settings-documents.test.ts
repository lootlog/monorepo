import { describe, expect, it } from "vitest";
import {
  applySettingsDocumentValues,
  createSettingsDocuments,
} from "@/test/settings-documents-fixtures";
import {
  getGuildTimerListsFromDocuments,
  getTimerAppearanceFromDocuments,
  getTimerBehaviorFromDocuments,
} from "./timer-settings-documents";

describe("timer settings documents", () => {
  it("returns the same derived object for the same documents and a new one after a timer change", () => {
    const documents = createSettingsDocuments({
      "timers.generalConfig": { removeTimerAfterMs: 5_000, compactView: true },
      "appearance.timers.displayConfig": { fontSize: 15 },
      "timers.hiddenTimers": ["global-hidden"],
    });

    const behavior = getTimerBehaviorFromDocuments(documents);
    expect(getTimerBehaviorFromDocuments(documents)).toBe(behavior);
    expect(behavior.generalConfig).toMatchObject({
      removeTimerAfterMs: 5_000,
      compactView: true,
      timersGrouping: false,
    });
    expect(behavior.layout).toBe("modern");
    expect(
      getTimerAppearanceFromDocuments(documents).displayConfig.fontSize,
    ).toBe(15);
    expect(getGuildTimerListsFromDocuments(documents).hiddenTimers).toEqual([
      "global-hidden",
    ]);

    const changed = applySettingsDocumentValues(documents, {
      "timers.generalConfig": { removeTimerAfterMs: 9_000 },
    });

    expect(getTimerBehaviorFromDocuments(changed)).not.toBe(behavior);
    expect(
      getTimerBehaviorFromDocuments(changed).generalConfig.removeTimerAfterMs,
    ).toBe(9_000);
  });

  it("falls back to defaults for missing documents and malformed record leaves", () => {
    expect(
      getTimerBehaviorFromDocuments(undefined).generalConfig.compactView,
    ).toBe(false);

    const malformed = createSettingsDocuments({
      "timers.generalConfig": { countdownMode: "sideways", compactView: "yes" },
      "timers.timersSortOrder": "upside-down",
    });

    expect(
      getTimerBehaviorFromDocuments(malformed).generalConfig,
    ).toMatchObject({ countdownMode: "max", compactView: false });
    expect(getTimerBehaviorFromDocuments(malformed).timersSortOrder).toBe(
      "asc",
    );
  });
});
