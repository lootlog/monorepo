import { isObjectRecord } from "@lootlog/schema/records";
import {
  isRuntimeFunction,
  type RuntimeFunction,
} from "@/lib/margonem-runtime/margonem-runtime-bridge";

export type RuntimeTipItem = {
  id?: unknown;
  cl?: unknown;
  own?: unknown;
  st?: unknown;
  loc?: unknown;
  setTip?: unknown;
  tip?: unknown;
};

type ItemTipRuntimeWindow = Window & {
  MargoTipsParser?: { getTip?: unknown };
  g?: { item?: Record<string, RuntimeTipItem | undefined> };
  itemTip?: (item: RuntimeTipItem, nosafe?: boolean) => string;
  hero?: { id?: unknown };
  Engine?: {
    heroEquipment?: { getItemBySt?: (st: number) => RuntimeTipItem | false };
    items?: { getItemById?: (id: string) => RuntimeTipItem | undefined };
  };
};

const getRuntimeWindow = (): ItemTipRuntimeWindow => window;

const MAIN_WEAPON_ST = 5;

const isTipHtml = (value: unknown): value is string =>
  typeof value === "string";

export function wrapItemTipBuilder(
  extend: (item: RuntimeTipItem, html: string) => string,
): (() => void) | null {
  const parser = getRuntimeWindow().MargoTipsParser;
  const original = parser?.getTip;

  if (!parser || !isRuntimeFunction(original)) return null;

  let active = true;

  const wrapped: RuntimeFunction = function (...args) {
    const html = Reflect.apply(original, this, args);
    const [item] = args;

    if (!active || !isTipHtml(html) || !isObjectRecord(item)) return html;

    try {
      return extend(item, html);
    } catch (error) {
      console.warn("[MargonemTooltips] Failed to extend item tooltip:", error);

      return html;
    }
  };

  parser.getTip = wrapped;

  return () => {
    active = false;

    if (parser.getTip === wrapped) parser.getTip = original;
  };
}

export function getHeroMainWeaponItemId(): string | null {
  const runtimeWindow = getRuntimeWindow();
  const engine = runtimeWindow.Engine;

  if (engine) {
    const weapon = engine.heroEquipment?.getItemBySt?.(MAIN_WEAPON_ST);

    return weapon ? getItemId(weapon) : null;
  }

  const heroId = String(runtimeWindow.hero?.id ?? "");

  for (const item of Object.values(runtimeWindow.g?.item ?? {})) {
    if (
      item?.loc === "g" &&
      item.st === MAIN_WEAPON_ST &&
      String(item.own) === heroId
    ) {
      return getItemId(item);
    }
  }

  return null;
}

export function getItemId(item: RuntimeTipItem): string | null {
  const id = Number.parseInt(String(item.id), 10);

  return Number.isSafeInteger(id) && id > 0 ? String(id) : null;
}

export function refreshItemTips(items: Iterable<RuntimeTipItem>): void {
  const runtimeWindow = getRuntimeWindow();

  for (const item of items) {
    try {
      if (isRuntimeFunction(item.setTip)) {
        item.setTip.call(item);
        continue;
      }

      const buildTip = runtimeWindow.itemTip;
      const id = String(item.id);

      if (!buildTip || runtimeWindow.g?.item?.[id] !== item) continue;

      const html = buildTip(item, true);
      item.tip = html;

      for (const element of document.querySelectorAll(`[id="item${id}"]`)) {
        element.setAttribute("tip", html);
      }
    } catch (error) {
      console.warn("[MargonemTooltips] Failed to refresh item tooltip:", error);
    }
  }
}

export function getHeroItem(itemId: string): RuntimeTipItem | undefined {
  const runtimeWindow = getRuntimeWindow();

  return (
    runtimeWindow.Engine?.items?.getItemById?.(itemId) ??
    runtimeWindow.g?.item?.[itemId]
  );
}
