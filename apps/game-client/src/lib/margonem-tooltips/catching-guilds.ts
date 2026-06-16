import type { Other } from "@lootlog/margonem/others";
import { getFixedT } from "@/i18n/get-fixed-t";
import {
  getOtherCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";
import { escapeTooltipHtml } from "./html";
import type { CharacterTooltipTransform } from "./types";

function buildCatchingGuildsBody(status: string, guildNames: string[]): string {
  const t = getFixedT("common");

  if (status === "error") {
    return escapeTooltipHtml(t("characterTooltip.catchingGuilds.error"));
  }

  if (status === "success") {
    if (guildNames.length === 0) {
      return escapeTooltipHtml(t("characterTooltip.catchingGuilds.empty"));
    }

    return guildNames.map(escapeTooltipHtml).join(", ");
  }

  return escapeTooltipHtml(t("characterTooltip.catchingGuilds.loading"));
}

function appendCatchingGuildsSection(
  currentHtml: string,
  status: string,
  guildNames: string[],
): string {
  const title = escapeTooltipHtml(
    getFixedT("common")("characterTooltip.catchingGuilds.title"),
  );
  const body = buildCatchingGuildsBody(status, guildNames);

  return `${currentHtml}<div class="ll-character-tooltip-catching-guilds" style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.18);font-size:11px;line-height:1.35;color:#d8e2f0;"><div style="font-weight:600;color:#ffffff;">${title}</div><div>${body}</div></div>`;
}

export const appendCatchingGuildsTooltipSection: CharacterTooltipTransform = ({
  character,
  currentHtml,
  kind,
}) => {
  if (kind !== "other") {
    return currentHtml;
  }

  const state = useCharacterTooltipCatchingGuildsStore.getState();
  if (!state.isShiftPressed) {
    return currentHtml;
  }

  const target = getOtherCatchingGuildsTarget(character as Other);
  if (!target) {
    return appendCatchingGuildsSection(currentHtml, "success", []);
  }

  const entry = state.entriesByKey[target.key];
  const guildNames = entry?.guilds.map((guild) => guild.name) ?? [];

  return appendCatchingGuildsSection(
    currentHtml,
    entry?.status ?? "idle",
    guildNames,
  );
};
