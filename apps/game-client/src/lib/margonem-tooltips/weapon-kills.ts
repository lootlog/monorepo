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

const COUNTERS_TTL_MS = 5 * 60_000;

// A failed read keeps what was shown before and is retried this much later.
const FAILED_READ_RETRY_MS = 30_000;

const MAX_CACHED_CHARACTERS = 200;

// The line sits in the game's own `t_item` tip, so it keeps its palette.
const LINE_STYLE = "margin-top:3px;font-size:11px;color:#e6d6bf;";

type CharacterCounters = {
  weapons: Map<string, number>;
  expiresAt: number;
};

const counters = new Map<string, CharacterCounters>();

const pendingLoads = new Set<string>();

// Items whose tip was built before their owner's counters arrived.
const itemsAwaitingCounters = new Map<string, Set<RuntimeTipItem>>();

const toKey = (world: string, characterId: string) => `${world}:${characterId}`;

function storeCounters(key: string, entry: CharacterCounters): void {
  counters.delete(key);
  counters.set(key, entry);

  if (counters.size > MAX_CACHED_CHARACTERS) {
    const oldest = counters.keys().next().value;

    if (oldest !== undefined) counters.delete(oldest);
  }
}

function refreshCharacterItems(
  key: string,
  characterId: string,
  weapons: Map<string, number>,
): void {
  const items = new Set(itemsAwaitingCounters.get(key));

  itemsAwaitingCounters.delete(key);

  for (const itemId of weapons.keys()) {
    const item = getHeroItem(itemId);

    if (item && String(item.own) === characterId) items.add(item);
  }

  const changed = [...items].filter((item) => {
    const itemId = getItemId(item);

    return itemId !== null && weapons.has(itemId);
  });

  if (changed.length > 0) refreshItemTips(changed);
}

function loadCounters(world: string, characterId: string): void {
  const key = toKey(world, characterId);

  if (pendingLoads.has(key)) return;
  pendingLoads.add(key);

  weaponKillsControllerGetCharacterWeaponKills({ world, characterId })
    .then(({ weapons: loaded }) => {
      const weapons = new Map(
        loaded.map(({ itemId, kills }) => [itemId, kills]),
      );

      storeCounters(key, { weapons, expiresAt: Date.now() + COUNTERS_TTL_MS });
      refreshCharacterItems(key, characterId, weapons);
    })
    .catch((error) => {
      console.warn("[WeaponKills] Failed to load weapon counters:", error);

      // Items keep waiting; a tip built after the retry delay asks again.
      storeCounters(key, {
        weapons: counters.get(key)?.weapons ?? new Map<string, number>(),
        expiresAt: Date.now() + FAILED_READ_RETRY_MS,
      });
    })
    .finally(() => {
      pendingLoads.delete(key);
    });
}

function renderWeaponKills(kills: number): string {
  const text = getFixedT("common")("itemTooltip.weaponKills", { count: kills });

  return `<div style="${LINE_STYLE}">${escapeTooltipHtml(text)}</div>`;
}

function extendItemTip(item: RuntimeTipItem, html: string): string {
  if (!MAIN_WEAPON_CLASSES.has(Number(item.cl))) return html;

  const itemId = getItemId(item);
  const ownerId = item.own === undefined ? "" : String(item.own);
  const world = useGameStore.getState().game?.world;

  if (!itemId || !/^\d+$/.test(ownerId) || !world) return html;

  const key = toKey(world, ownerId);
  const entry = counters.get(key);

  if (!entry || Date.now() >= entry.expiresAt) {
    const awaiting = itemsAwaitingCounters.get(key) ?? new Set();
    awaiting.add(item);
    itemsAwaitingCounters.set(key, awaiting);
    loadCounters(world, ownerId);
  }

  const kills = entry?.weapons.get(itemId);

  return kills ? html + renderWeaponKills(kills) : html;
}

/** Applies a counter the server returned after recording the hero's kills. */
export function setWeaponKills(
  world: string,
  characterId: string,
  itemId: string,
  kills: number,
): void {
  const key = toKey(world, characterId);
  const entry = counters.get(key);
  const weapons = new Map(entry?.weapons);

  weapons.set(itemId, kills);
  storeCounters(key, { weapons, expiresAt: entry?.expiresAt ?? 0 });
  refreshCharacterItems(key, characterId, new Map([[itemId, kills]]));
}

/**
 * Adds the "players killed" line to main weapon tips in both interfaces and
 * loads the hero's counters, whose tips the game built before this ran.
 */
export function installWeaponKillsTooltips(): () => void {
  const restore = wrapItemTipBuilder(extendItemTip);

  if (!restore) return () => undefined;

  const game = useGameStore.getState().game;

  if (game) loadCounters(game.world, game.hero.characterId);

  return () => {
    restore();
    counters.clear();
    itemsAwaitingCounters.clear();
  };
}
