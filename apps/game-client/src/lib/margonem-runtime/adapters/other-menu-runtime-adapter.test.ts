import { afterEach, describe, expect, it } from "vitest";
import { testRuntimeWindow } from "@/test/test-runtime-window";
import {
  type RuntimeMenuEntry,
  wrapOtherMenu,
} from "./other-menu-runtime-adapter";

const noop = () => undefined;

// The game's hook pushes its moderation entry; Other.js then shows the menu.
const installOthers = () => {
  const others = {
    getById: (id: string | number) =>
      String(id) === "7"
        ? { d: { id: "7", account: 3001, nick: "Ziomek" } }
        : undefined,
    addMcPanelToMenu: (_id: string | number, _nick: string, menu: unknown[]) =>
      void menu.push(["MC Panel", noop]),
  };

  testRuntimeWindow.Engine = { others };

  return others;
};

// The wrapper replaces the hook on the same object the game calls it on.
const openMenu = (others: ReturnType<typeof installOthers>, id: string) => {
  const menu: RuntimeMenuEntry[] = [];

  others.addMcPanelToMenu(id, "nick", menu);

  return menu.map(([label]) => label);
};

afterEach(() => {
  delete testRuntimeWindow.Engine;
});

describe("other menu runtime", () => {
  it("adds entries for the clicked player's Margonem account after the game's own", () => {
    const others = installOthers();
    const seen: string[] = [];

    wrapOtherMenu(({ accountId, characterId }) => {
      seen.push(`${accountId}/${characterId}`);

      return [["Nadaj aurę", noop]];
    });

    expect(openMenu(others, "7")).toEqual(["MC Panel", "Nadaj aurę"]);
    expect(seen).toEqual(["3001/7"]);
    // A player who left the map has no account to act on.
    expect(openMenu(others, "8")).toEqual(["MC Panel"]);
  });

  it("keeps the game's menu when the extension fails, and restores the hook", () => {
    const others = installOthers();
    const original = others.addMcPanelToMenu;

    const restore = wrapOtherMenu(() => {
      throw new Error("broken");
    });

    expect(openMenu(others, "7")).toEqual(["MC Panel"]);

    restore?.();

    expect(others.addMcPanelToMenu).toBe(original);
  });
});
