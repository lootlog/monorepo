import type { FactionWarResponseDto } from "@lootlog/client/main";
import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useAnimationEffects } from "@/hooks/use-animation-effects";
import { FactionWarHeader } from "./faction-war-header";
import { getFactionTotal } from "./faction-war-pick-state";
import { FactionWarPlateButton } from "./faction-war-plate-button";
import {
  formatFactionWarDay,
  formatFactionWarLastDay,
  formatFactionWarPoints,
  PICK_SCREEN_FACTIONS,
} from "./faction-war-presentation";
import {
  getFactionWarOutcome,
  type FactionWarOutcome,
} from "./faction-war-result-state";
import { FactionWarResultSide } from "./faction-war-result-side";
import type { FactionSideEmphasis } from "./faction-war-side";
import { FactionWarStage } from "./faction-war-stage";

const getEmphasis = (
  faction: FactionWarFaction,
  outcome: FactionWarOutcome,
): FactionSideEmphasis => {
  if (outcome.kind === "tie") return "chosen";

  if (outcome.kind === "none") return "none";

  return outcome.faction === faction ? "chosen" : "lost";
};

/**
 * How the war ended, on the pick screen's stage: the winning half lit and
 * the other greyed, both lit on a tie, the final score in each corner and
 * the player's own part under the title.
 */
export const FactionWarResultScreen: FC<{
  war: FactionWarResponseDto;
  onClose: () => void;
}> = ({ war, onClose }) => {
  const { t } = useTranslation("factionWar");
  const motion = useAnimationEffects();
  const outcome = getFactionWarOutcome(war);
  const { pick } = war;
  const champion = war.champion?.isChampion && war.champion.warId === war.id;

  const title =
    outcome.kind === "winner"
      ? t("result.winner", { name: t(`factions.${outcome.faction}.name`) })
      : t(`result.${outcome.kind}`);

  return (
    <FactionWarStage
      warId={war.id}
      state={`result-${outcome.kind}`}
      onEscape={onClose}
    >
      {PICK_SCREEN_FACTIONS.map((faction) => {
        const total = getFactionTotal(war, faction);

        return (
          <FactionWarResultSide
            key={faction}
            warId={war.id}
            faction={faction}
            emphasis={getEmphasis(faction, outcome)}
            motion={motion}
            players={total?.players ?? null}
            points={total?.points ?? 0}
            won={war.winners.includes(faction)}
          />
        );
      })}
      <FactionWarHeader
        eyebrow={t("result.eyebrow", {
          startsAt: formatFactionWarDay(Date.parse(war.startsAt)),
          endsAt: formatFactionWarLastDay(war.endsAt),
        })}
        title={title}
      >
        {outcome.kind === "none" ? (
          <p className="ll-fw-summary">{t("result.noneDescription")}</p>
        ) : null}
        {pick?.disqualified ? (
          <p className="ll-fw-summary">{t("result.disqualified")}</p>
        ) : null}
        {pick && !pick.disqualified ? (
          <p className="ll-fw-summary ll-fw-own">
            {t("result.yourPoints", {
              faction: t(`factions.${pick.faction}.genitive`),
              points: formatFactionWarPoints(pick.points),
            })}
          </p>
        ) : null}
        {champion ? (
          <p className="ll-fw-summary">{t("result.champion")}</p>
        ) : null}
      </FactionWarHeader>
      <FactionWarPlateButton
        warId={war.id}
        label={t("result.close")}
        onClick={onClose}
      />
    </FactionWarStage>
  );
};
