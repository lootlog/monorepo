import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import { getFixedT } from "@/i18n/get-fixed-t";
import { escapeTooltipHtml } from "@/lib/margonem-tooltips/html";
import type { CharacterTooltipTransform } from "@/lib/margonem-tooltips/types";
import type { RuntimeInterface } from "@/lib/margonem-runtime/runtime.types";
import { getFactionWarAssetUrl } from "./faction-war-assets";
import type { ChampionFactions } from "./faction-war-champions";
import { FACTION_COLORS } from "./faction-war-presentation";

// NI closes its nick header with `</div></div>` (setTipHeader); SI opens the
// tip with the nick in bold. The badge goes right under the nick.
const NI_HEADER_START = 'class="info-wrapper"';

const NI_HEADER_END = "</div></div>";

const SI_NICK_END = "</b>";

const findNickEnd = (html: string, runtimeInterface: RuntimeInterface) => {
  if (runtimeInterface === "si") {
    const index = html.indexOf(SI_NICK_END);

    return index === -1 ? -1 : index + SI_NICK_END.length;
  }

  const start = html.indexOf(NI_HEADER_START);
  const end = start === -1 ? -1 : html.indexOf(NI_HEADER_END, start);

  return end === -1 ? -1 : end + NI_HEADER_END.length;
};

const renderBadge = (warId: string, faction: FactionWarFaction) => {
  const t = getFixedT("factionWar");
  const colors = FACTION_COLORS[faction];
  const emblem = getFactionWarAssetUrl(warId, faction, "emblem");

  const label = escapeTooltipHtml(
    t("champion.tooltip", { name: t(`factions.${faction}.name`) }),
  );

  const icon = emblem
    ? `<img src="${escapeTooltipHtml(emblem)}" alt="" style="width:16px;height:16px;flex:none;">`
    : "";

  // Inline styles keep the badge independent of both games' tip stylesheets.
  return `<div class="ll-fw-champion-tip" style="display:flex;align-items:center;justify-content:center;gap:4px;margin:2px 0;font-size:11px;font-weight:bold;line-height:16px;color:${colors.text};text-shadow:0 0 6px ${colors.glow};">${icon}<span>${label}</span></div>`;
};

/**
 * Marks a champion's tooltip with their faction's crest and name, under the
 * nick, wherever the game shows that player's tip.
 */
export const createChampionTooltipTransform = (
  warId: string,
  factions: ChampionFactions,
): CharacterTooltipTransform => {
  return ({ character, currentHtml, interface: runtimeInterface }) => {
    const id = character.d?.id;
    const faction = id === undefined ? undefined : factions.get(String(id));

    if (!faction) return currentHtml;

    const badge = renderBadge(warId, faction);
    const index = findNickEnd(currentHtml, runtimeInterface);

    return index === -1
      ? `${badge}${currentHtml}`
      : `${currentHtml.slice(0, index)}${badge}${currentHtml.slice(index)}`;
  };
};
