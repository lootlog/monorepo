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

const MAIN_WEAPON_CLASSES = new Set([1, 2, 3, 4, 6]);

const FAILED_READ_RETRY_MS = 30_000;

const SECTION_STYLE = "display:flex;align-items:baseline;gap:4px;";

const COUNT_STYLE = "color:orange;";

const SOURCE_STYLE = "margin-left:auto;padding-left:8px;color:#8a7f73;";

const REQUIREMENTS_SECTION = '<div class="item-tip-section s-9';

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

      for (const { itemId, kills } of weapons) {
        if (!counters.has(itemId)) counters.set(itemId, kills);
      }

      refreshHeroWeapons(weapons.map(({ itemId }) => itemId));
    })
    .catch((error) => {
      console.warn("[WeaponKills] Failed to load weapon counters:", error);
      loadState = "idle";
      nextLoadAt = Date.now() + FAILED_READ_RETRY_MS;
    });
}

function renderWeaponKills(kills: number): string {
  const t = getFixedT("common");
  const label = escapeTooltipHtml(t("itemTooltip.weaponKills.label"));
  const source = escapeTooltipHtml(t("itemTooltip.weaponKills.source"));

  return `<div class="item-tip-section" style="${SECTION_STYLE}"><span>${label}</span><span style="${COUNT_STYLE}">${kills}</span><span style="${SOURCE_STYLE}">${source}</span></div>`;
}

function insertSection(html: string, section: string): string {
  const index = html.indexOf(REQUIREMENTS_SECTION);

  if (index === -1) return html + section;

  return html.slice(0, index) + section + html.slice(index);
}

function extendItemTip(item: RuntimeTipItem, html: string): string {
  if (!MAIN_WEAPON_CLASSES.has(Number(item.cl))) return html;

  const game = useGameStore.getState().game;

  if (!game || String(item.own) !== game.hero.characterId) return html;

  loadCounters(game.world, game.hero.characterId);

  const itemId = getItemId(item);
  const kills = itemId ? counters.get(itemId) : undefined;

  return kills ? insertSection(html, renderWeaponKills(kills)) : html;
}

export function setWeaponKills(itemId: string, kills: number): void {
  counters.set(itemId, kills);
  refreshHeroWeapons([itemId]);
}

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
