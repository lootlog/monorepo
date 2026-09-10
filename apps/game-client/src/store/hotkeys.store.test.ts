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
    expect(migrated.bindings["chat-position"]).toEqual({
      type: "keyboard",
      key: "P",
      shift: false,
      ctrl: false,
      alt: true,
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

it("upgrades unassigned quick actions while preserving custom bindings and avoiding conflicts", () => {
  const empty = {
    type: "keyboard",
    key: "",
    shift: false,
    ctrl: false,
    alt: false,
  };

  const custom = {
    type: "keyboard",
    key: "J",
    shift: true,
    ctrl: false,
    alt: false,
  };

  const occupied = {
    type: "keyboard",
    key: "P",
    shift: false,
    ctrl: false,
    alt: true,
  };

  const migrated = migrateHotkeysState(
    {
      bindings: {
        "chat-help": empty,
        "chat-position": empty,
        "toggle-chat": occupied,
      },
    },
    6,
  );

  expect(migrated.bindings["chat-help"]).toEqual({
    ...empty,
    key: "H",
    alt: true,
  });
  expect(migrated.bindings["chat-position"]).toEqual(empty);
  expect(migrated.bindings["toggle-chat"]).toEqual(occupied);
  expect(
    migrateHotkeysState({ bindings: { "chat-help": custom } }, 6).bindings[
      "chat-help"
    ],
  ).toEqual(custom);
  expect(
    migrateHotkeysState({ bindings: { "chat-help": empty } }, 7).bindings[
      "chat-help"
    ],
  ).toEqual(empty);
});

it("adds unassigned party creation to version 7 without replacing custom bindings", () => {
  const custom = {
    type: "keyboard",
    key: "G",
    alt: true,
    ctrl: false,
    shift: false,
  };

  const migrated = migrateHotkeysState(
    { bindings: { "chat-help": custom } },
    7,
  );

  expect(migrated.bindings["chat-help"]).toEqual(custom);
  expect(migrated.bindings["create-party-gathering"]).toEqual({
    type: "keyboard",
    key: "",
    alt: false,
    ctrl: false,
    shift: false,
  });
});
