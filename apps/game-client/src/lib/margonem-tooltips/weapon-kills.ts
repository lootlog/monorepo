import { weaponKillsControllerGetCharacterWeaponKills } from "@lootlog/client/battlelog";
import { getFixedT } from "@/i18n/get-fixed-t";
import {
  getHeroItem,
  getItemId,
  refreshItemTips,
  wrapItemTipBuilder,
  type RuntimeTipItem,
} from "@/lib/margonem-runtime/adapters/item-tip-runtime-adapter";
import { useGameStore } from "@/store/game.store";
import { escapeTooltipHtml } from "./html";

// One-handed, two-handed, hand-and-a-half, ranged and wand: the classes that
// go into the main weapon slot.
const MAIN_WEAPON_CLASSES = new Set([1, 2, 3, 4, 6]);

// A failed read is retried by the next weapon tip built after this delay.
const FAILED_READ_RETRY_MS = 30_000;

// The line sits in the game's own `t_item` tip, so it keeps its palette.
const LINE_STYLE = "margin-top:3px;font-size:11px;color:#e6d6bf;";

// The hero's counters by item id. A character switch reloads the page.
const counters = new Map<string, number>();

let loadState: "idle" | "loading" | "loaded" = "idle";

let nextLoadAt = 0;

function refreshHeroWeapons(itemIds: Iterable<string>): void {
  const items = [...itemIds].flatMap((itemId) => getHeroItem(itemId) ?? []);

  if (items.length > 0) refreshItemTips(items);
}

function loadCounters(world: string, characterId: string): void {
  if (loadState !== "idle" || Date.now() < nextLoadAt) return;

  loadState = "loading";

  weaponKillsControllerGetCharacterWeaponKills({ world, characterId })
    .then(({ weapons }) => {
      loadState = "loaded";

      // A counter recorded while the read was in flight is newer.
      for (const { itemId, kills } of weapons) {
        if (!counters.has(itemId)) counters.set(itemId, kills);
      }

      // The game built these tips before the counters arrived.
      refreshHeroWeapons(weapons.map(({ itemId }) => itemId));
    })
    .catch((error) => {
      console.warn("[WeaponKills] Failed to load weapon counters:", error);
      loadState = "idle";
      nextLoadAt = Date.now() + FAILED_READ_RETRY_MS;
    });
}

function renderWeaponKills(kills: number): string {
  const text = getFixedT("common")("itemTooltip.weaponKills", { count: kills });

  return `<div style="${LINE_STYLE}">${escapeTooltipHtml(text)}</div>`;
}

function extendItemTip(item: RuntimeTipItem, html: string): string {
  if (!MAIN_WEAPON_CLASSES.has(Number(item.cl))) return html;

  const game = useGameStore.getState().game;

  if (!game || String(item.own) !== game.hero.characterId) return html;

  loadCounters(game.world, game.hero.characterId);

  const itemId = getItemId(item);
  const kills = itemId ? counters.get(itemId) : undefined;

  return kills ? html + renderWeaponKills(kills) : html;
}

/** Applies a counter the server returned after recording the hero's kills. */
export function setWeaponKills(itemId: string, kills: number): void {
  counters.set(itemId, kills);
  refreshHeroWeapons([itemId]);
}

/**
 * Adds the "players killed" line to the tips of the hero's main weapons in
 * both interfaces and loads the hero's counters.
 */
export function installWeaponKillsTooltips(): () => void {
  const restore = wrapItemTipBuilder(extendItemTip);

  if (!restore) return () => undefined;

  const game = useGameStore.getState().game;

  if (game) loadCounters(game.world, game.hero.characterId);

  return () => {
    restore();
    counters.clear();
    loadState = "idle";
    nextLoadAt = 0;
  };
}
