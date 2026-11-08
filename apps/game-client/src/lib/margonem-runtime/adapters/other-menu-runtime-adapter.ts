import type { Other } from "@lootlog/margonem/others";

/**
 * An entry of NI's popup menu: Interface.js `showPopupMenu` renders the label
 * as html and calls the handler on click.
 */
export type RuntimeMenuEntry = [label: string, onClick: () => void];

/** The player on the map whose menu is being built. */
export type RuntimeMenuOther = {
  accountId: string;
  characterId: string;
};

/**
 * OthersManager.js `addMcPanelToMenu(id, nick, menu)` (core/characters/
 * OthersManager.js:341): an arrow function of the character id that only
 * pushes to `menu`, so it has no receiver and returns nothing.
 */
type AddMcPanelToMenu = (
  id: number | string,
  nick: string,
  menu: RuntimeMenuEntry[],
) => void;

type OtherMenuRuntimeWindow = Window & {
  Engine?: {
    others?: {
      addMcPanelToMenu?: AddMcPanelToMenu;
      getById?: (id: number | string) => Other | undefined;
    };
  };
};

const getRuntimeWindow = (): OtherMenuRuntimeWindow => window;

const toRuntimeMenuOther = (id: number | string): RuntimeMenuOther | null => {
  const other = getRuntimeWindow().Engine?.others?.getById?.(id);
  const account = other?.d.account;

  if (!other || !Number.isSafeInteger(account) || !account || account <= 0)
    return null;

  return { accountId: String(account), characterId: String(other.d.id) };
};

/**
 * Appends entries to the menu NI opens on another player. Other.js
 * `createMenu` (core/characters/Other.js:583) and a chat nick's menu
 * (core/chat/ChatMessage.js:317) call `Engine.others.addMcPanelToMenu(id,
 * nick, menu)` last, through the public property, so wrapping it adds entries
 * at the end. It runs only on a right click, never per frame. A chat nick
 * resolves only while that player is on the map.
 *
 * The wrapper keeps the arguments, and a failing
 * `extend` leaves the game's menu unchanged. Another addon may wrap the hook
 * on top of this wrapper, so restoring also turns it into a pass-through.
 * Returns null outside NI.
 */
export function wrapOtherMenu(
  extend: (other: RuntimeMenuOther) => RuntimeMenuEntry[],
): (() => void) | null {
  const others = getRuntimeWindow().Engine?.others;
  const original = others?.addMcPanelToMenu;

  if (!others || !original) return null;

  let active = true;

  const wrapped: AddMcPanelToMenu = (id, nick, menu) => {
    original(id, nick, menu);

    if (!active || !Array.isArray(menu)) return;

    try {
      const other = toRuntimeMenuOther(id);

      if (other) menu.push(...extend(other));
    } catch (error) {
      console.warn("[Lootlog] Failed to extend player menu:", error);
    }
  };

  others.addMcPanelToMenu = wrapped;

  return () => {
    active = false;

    if (others.addMcPanelToMenu === wrapped) others.addMcPanelToMenu = original;
  };
}
