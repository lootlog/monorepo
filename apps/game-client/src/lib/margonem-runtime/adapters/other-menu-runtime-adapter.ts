import type { Other } from "@lootlog/margonem/others";

export type RuntimeMenuEntry = [label: string, onClick: () => void];

export type RuntimeMenuOther = {
  accountId: string;
  characterId: string;
};

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
