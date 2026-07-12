import { describe, expect, it } from "vitest";
import { migrateHotkeysState } from "./hotkeys.store";

describe("migrateHotkeysState", () => {
  it("adds missing default bindings without replacing custom bindings", () => {
    const customToggleCommand = {
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

    expect(migrated.bindings["toggle-command"]).toEqual({
      type: "keyboard",
      ...customToggleCommand,
    });
    expect(migrated.bindings["toggle-quick-access"]).toEqual({
      type: "keyboard",
      key: "Q",
      shift: true,
      ctrl: false,
      alt: false,
    });
    expect(migrated.bindings["map-ping"]).toEqual({
      type: "mouse",
      button: 1,
      shift: false,
      ctrl: false,
      alt: false,
    });
  });
});
