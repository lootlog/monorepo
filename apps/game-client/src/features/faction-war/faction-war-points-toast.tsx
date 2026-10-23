import type {
  FactionWarAwardDto,
  FactionWarResponseDto,
} from "@lootlog/client/main";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { getFixedT } from "@/i18n/get-fixed-t";
import { queryClient } from "@/lib/query-client";
import { getFactionWarAssetUrl } from "./faction-war-assets";
import {
  addFactionWarPoints,
  type FactionWarPointsBurst,
} from "./faction-war-points";
import { readShowFactionWarPoints } from "./faction-war-preferences";
import {
  FACTION_COLORS,
  formatFactionWarPoints,
} from "./faction-war-presentation";
import { CURRENT_FACTION_WAR_QUERY_KEY } from "./use-current-faction-war";

/** Long enough to read a sum that is still growing. */
const POINTS_TOAST_DURATION_MS = 3_500;

let burst: FactionWarPointsBurst | null = null;

/**
 * Shows the points a kill or loot response earned for the player's faction
 * in one small toast, adding awards that arrive close together into it. Does
 * nothing when the response earned nothing, the player turned the toasts
 * off, or the player was disqualified.
 */
export const announceFactionWarPoints = (
  award: FactionWarAwardDto | undefined,
): void => {
  const next = addFactionWarPoints(burst, award, Date.now());

  if (!next || !readShowFactionWarPoints()) return;

  const war = queryClient.getQueryData<FactionWarResponseDto>(
    CURRENT_FACTION_WAR_QUERY_KEY,
  );

  if (war?.pick?.disqualified) return;

  burst = next;

  const t = getFixedT("factionWar");
  const colors = FACTION_COLORS[next.faction];

  const emblem = war
    ? getFactionWarAssetUrl(war.id, next.faction, "emblem")
    : null;

  // SAFETY: CSSProperties has no index signature for custom properties; the
  // `--normal-*` colours are read by the Toaster's toast styles.
  const style = {
    "--normal-text": colors.text,
    "--normal-border": `color-mix(in srgb, ${colors.glow} 45%, transparent)`,
  } as CSSProperties;

  toast(
    t("points.toast", {
      points: formatFactionWarPoints(next.points),
      faction: t(`factions.${next.faction}.genitive`),
    }),
    {
      id: `faction-war-points-${next.id}`,
      duration: POINTS_TOAST_DURATION_MS,
      icon: emblem ? (
        <img src={emblem} alt="" className="ll:size-5" draggable={false} />
      ) : undefined,
      style,
    },
  );
};
