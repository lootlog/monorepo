import { isObjectRecord } from "@lootlog/schema/records";
import {
  isRuntimeFunction,
  type RuntimeFunction,
} from "@/lib/margonem-runtime/margonem-runtime-bridge";

/**
 * The item a tip is built for: an NI `Item` instance or an SI `g.item` entry.
 * Both carry the item packet fields. NI suffixes the id of an item shown in
 * another player's equipment with `-showeq` and sets `own` to that player.
 */
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
  // Both interfaces build item tip html with the shared TipsParser script.
  MargoTipsParser?: { getTip?: unknown };
  // SI caches each item's tip html in `g.item[id].tip` and `#item{id}[tip]`.
  g?: { item?: Record<string, RuntimeTipItem | undefined> };
  itemTip?: (item: RuntimeTipItem, nosafe?: boolean) => string;
  hero?: { id?: unknown };
  Engine?: {
    heroEquipment?: { getItemBySt?: (st: number) => RuntimeTipItem | false };
    items?: { getItemById?: (id: string) => RuntimeTipItem | undefined };
  };
};

const getRuntimeWindow = (): ItemTipRuntimeWindow => window;

/** The equipment slot of the main weapon in both interfaces. */
const MAIN_WEAPON_ST = 5;

/**
 * Wraps the shared item tip builder so `extend` can append html. The game
 * calls `MargoTipsParser.getTip(item, cmpStats)`; the wrapper keeps the
 * receiver, arguments and return value, and a failing `extend` leaves the
 * game's html unchanged. Returns null while the parser is not loaded.
 *
 * Another addon may wrap `getTip` on top of this wrapper, which then cannot
 * be unwrapped. Restoring therefore also turns it into a pass-through, so a
 * reinstalled wrapper does not extend the same tip twice.
 */
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
    const html = original.apply(this, args);
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

/** The unique id of the main weapon the hero wears, if any. */
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

/** The item's unique id without NI's `-showeq` view suffix. */
export function getItemId(item: RuntimeTipItem): string | null {
  const id = Number.parseInt(String(item.id), 10);

  return Number.isSafeInteger(id) && id > 0 ? String(id) : null;
}

/**
 * Rebuilds the cached tip html of items whose tooltip content changed. NI
 * items rebuild their own tip, which every view of the item shares; SI keeps
 * the html in the item and in the `tip` attribute of each of its elements.
 */
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

/** The hero's item with this id, in either interface. */
export function getHeroItem(itemId: string): RuntimeTipItem | undefined {
  const runtimeWindow = getRuntimeWindow();

  return (
    runtimeWindow.Engine?.items?.getItemById?.(itemId) ??
    runtimeWindow.g?.item?.[itemId]
  );
}
