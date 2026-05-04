import { describe, expect, it } from "vitest";
import { migrateHotkeysState, type HotkeyBinding } from "./hotkeys.store";

describe("migrateHotkeysState", () => {
  it("adds missing default bindings without replacing custom bindings", () => {
    const customToggleCommand: HotkeyBinding = {
      key: "X",
      shift: false,
      ctrl: true,
      alt: false,
    };

    const migrated = migrateHotkeysState({
      bindings: {
        "toggle-command": customToggleCommand,
      },
    });

    expect(migrated.bindings["toggle-command"]).toEqual(customToggleCommand);
    expect(migrated.bindings["toggle-quick-access"]).toEqual({
      key: "Q",
      shift: true,
      ctrl: false,
      alt: false,
    });
  });
});
