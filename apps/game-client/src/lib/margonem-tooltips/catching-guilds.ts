import { getFixedT } from "@/i18n/get-fixed-t";
import {
  getLootlogOtherGlowColor,
  LOOTLOG_OTHER_GLOW_BLUE,
} from "@/lib/margonem-runtime/adapters/glow-runtime-adapter";
import {
  getSelectedLootlogGuildId,
  isConcreteLootlogGuildId,
} from "@/lib/selected-lootlog-guild";
import {
  getOtherCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
  type CharacterTooltipCatchingGuildsEntry,
} from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useSettingsStore } from "@/store/settings.store";
import { escapeTooltipHtml } from "./html";
import type { CharacterTooltipTransform } from "./types";

// The section is inserted into the game's own `t_other` tooltip, so it keeps
// the game's palette (tipsParser.css) and its `.line` separator. Inline styles
// keep it independent of Lootlog's stylesheet.
const TEXT_COLOR = "#e6d6bf";

const MUTED_COLOR = "#a8998a";

const ERROR_COLOR = "#ff8a73";

const NO_LOOTLOG_DOT_COLOR = "#6b6460";

const MAX_GUILD_CHIPS = 4;

const SECTION_STYLE = `font-size:11px;line-height:14px;color:${TEXT_COLOR};text-align:center;`;

const HEADER_STYLE =
  "display:flex;align-items:center;justify-content:center;gap:5px;font-weight:bold;color:#fff;";

const MESSAGE_STYLE = "margin-top:2px;";

const CHIPS_STYLE =
  "display:flex;flex-wrap:wrap;justify-content:center;gap:3px;margin-top:3px;";

const CHIP_STYLE =
  "max-width:100%;padding:0 5px;border:1px solid rgba(255,255,255,.2);border-radius:2px;background:rgba(255,255,255,.1);line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";

type GuildChip = { id: string; name: string };

function renderDot(color: string): string {
  return `<span style="flex:none;width:6px;height:6px;border-radius:50%;background:${color};box-shadow:0 0 4px ${color};"></span>`;
}

function renderHeader(dotColor: string, ownerName?: string): string {
  const t = getFixedT("common");
  const title = escapeTooltipHtml(t("characterTooltip.title"));

  const owner = ownerName
    ? `<span style="font-weight:normal;color:${MUTED_COLOR};">·</span><span style="min-width:0;font-weight:normal;color:${TEXT_COLOR};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeTooltipHtml(ownerName)}</span>`
    : "";

  return `<div style="${HEADER_STYLE}">${renderDot(dotColor)}<span>${title}</span>${owner}</div>`;
}

function renderMessage(message: string, color = MUTED_COLOR): string {
  return `<div style="${MESSAGE_STYLE}color:${color};">${escapeTooltipHtml(message)}</div>`;
}

function renderGuildChips(
  guilds: GuildChip[],
  selectedGuildId: string,
): string {
  const t = getFixedT("common");

  // The selected Lootlog leads, matching the blue glow it gives on the map.
  // The userscript targets es2020, so sort a copy instead of using toSorted.
  const ordered = [...guilds].sort(
    (left, right) =>
      Number(right.id === selectedGuildId) -
      Number(left.id === selectedGuildId),
  );

  const visible = ordered.slice(0, MAX_GUILD_CHIPS);
  const hiddenCount = ordered.length - visible.length;

  const chips = visible.map((guild) => {
    const selectedStyle =
      guild.id === selectedGuildId
        ? `color:${LOOTLOG_OTHER_GLOW_BLUE};border-color:rgba(62,209,222,.5);background:rgba(62,209,222,.12);`
        : "";

    return `<span style="${CHIP_STYLE}${selectedStyle}">${escapeTooltipHtml(guild.name)}</span>`;
  });

  if (hiddenCount > 0) {
    chips.push(
      `<span style="${CHIP_STYLE}color:${MUTED_COLOR};">${escapeTooltipHtml(
        t("characterTooltip.catchingGuilds.more", { count: hiddenCount }),
      )}</span>`,
    );
  }

  return `<div style="${CHIPS_STYLE}">${chips.join("")}</div>`;
}

function renderOwnerBody(
  entry: CharacterTooltipCatchingGuildsEntry | undefined,
  selectedGuildId: string,
): string {
  const t = getFixedT("common");

  if (entry?.status === "error") {
    return renderMessage(t("characterTooltip.error"), ERROR_COLOR);
  }

  if (entry?.status !== "success") {
    return renderMessage(t("characterTooltip.loading"));
  }

  if (entry.guilds.length === 0) {
    return renderMessage(t("characterTooltip.catchingGuilds.empty"));
  }

  return `${renderMessage(t("characterTooltip.catchingGuilds.title"))}${renderGuildChips(entry.guilds, selectedGuildId)}`;
}

function renderSection(content: string): string {
  return `<div class="line"></div><div class="ll-character-tooltip-catching-guilds" style="${SECTION_STYLE}">${content}</div>`;
}

function renderWithoutOwner(): string {
  const t = getFixedT("common");
  const ownersStatus = useOnlineCharacterOwnersStore.getState().status;

  if (ownersStatus === "loading") {
    return `${renderHeader(NO_LOOTLOG_DOT_COLOR)}${renderMessage(t("characterTooltip.loading"))}`;
  }

  if (ownersStatus === "error") {
    return `${renderHeader(NO_LOOTLOG_DOT_COLOR)}${renderMessage(t("characterTooltip.error"), ERROR_COLOR)}`;
  }

  if (ownersStatus === "forbidden") {
    return `${renderHeader(NO_LOOTLOG_DOT_COLOR)}${renderMessage(t("characterTooltip.forbidden"))}`;
  }

  return `${renderHeader(NO_LOOTLOG_DOT_COLOR)}${renderMessage(t("characterTooltip.notInLootlog"))}`;
}

export const appendCatchingGuildsTooltipSection: CharacterTooltipTransform = ({
  character,
  currentHtml,
}) => {
  const state = useCharacterTooltipCatchingGuildsStore.getState();

  if (!state.isShiftPressed) return currentHtml;

  const selectedGuildId = getSelectedLootlogGuildId(
    useSettingsStore.getState().guildIdByCharId,
  );

  if (!isConcreteLootlogGuildId(selectedGuildId)) return currentHtml;

  const target = getOtherCatchingGuildsTarget(character);

  if (!target) return `${currentHtml}${renderSection(renderWithoutOwner())}`;

  const entry = state.entriesByKey[target.key];

  const header = renderHeader(
    getLootlogOtherGlowColor(entry, selectedGuildId),
    target.ownerName,
  );

  return `${currentHtml}${renderSection(`${header}${renderOwnerBody(entry, selectedGuildId)}`)}`;
};
