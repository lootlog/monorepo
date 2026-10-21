import {
  useFactionWarsControllerPickFaction,
  type FactionWarResponseDto,
} from "@lootlog/client/main";
import { getApiErrorStringField } from "@lootlog/client/transport";
import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { useAnimationEffects } from "@/hooks/use-animation-effects";
import { useGameStore } from "@/store/game.store";
import { getFactionWarAssetUrl } from "./faction-war-assets";
import { FactionWarHeader } from "./faction-war-header";
import {
  getFactionTotal,
  getFactionUnderdogBonus,
} from "./faction-war-pick-state";
import { FactionWarPickChosen } from "./faction-war-pick-chosen";
import { FactionWarPickConfirm } from "./faction-war-pick-confirm";
import { FactionWarPickSide } from "./faction-war-pick-side";
import { FactionWarPlateButton } from "./faction-war-plate-button";
import {
  formatFactionWarLastDay,
  PICK_SCREEN_FACTIONS,
} from "./faction-war-presentation";
import type { FactionSideEmphasis } from "./faction-war-side";
import { FactionWarStage } from "./faction-war-stage";
import { CURRENT_FACTION_WAR_QUERY_KEY } from "./use-current-faction-war";

type Phase =
  | { kind: "idle" }
  | { kind: "confirming"; faction: FactionWarFaction; error: string | null }
  | { kind: "choosing"; faction: FactionWarFaction }
  | { kind: "chosen"; faction: FactionWarFaction };

/** How long the chosen faction stays on screen before it closes. */
const CHOSEN_HOLD_MS = 2_600;

const getEmphasis = (
  faction: FactionWarFaction,
  phase: Phase,
  hovered: FactionWarFaction | null,
): FactionSideEmphasis => {
  if (phase.kind === "choosing" || phase.kind === "chosen") {
    return phase.faction === faction ? "chosen" : "lost";
  }

  const focused = phase.kind === "confirming" ? phase.faction : hovered;

  if (!focused) return "none";

  return focused === faction ? "active" : "muted";
};

type FactionWarPickScreenProps = {
  war: FactionWarResponseDto;
  /** "Nie teraz": closes and remembers it for this war. */
  onDismiss: () => void;
  /** Closes after a faction was chosen. */
  onClose: () => void;
};

/**
 * The faction pick, over the middle of the game: fire on the left, ice on
 * the right. Choosing asks for confirmation, plays the side's effect while
 * the pick is saved and shows the locked faction before closing.
 */
export const FactionWarPickScreen: FC<FactionWarPickScreenProps> = ({
  war,
  onDismiss,
  onClose,
}) => {
  const { t } = useTranslation("factionWar");
  const queryClient = useQueryClient();
  const motion = useAnimationEffects();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [hovered, setHovered] = useState<FactionWarFaction | null>(null);
  const hero = useGameStore((state) => state.game?.hero);
  const world = useGameStore((state) => state.game?.world);
  const pick = useFactionWarsControllerPickFaction();

  useEffect(() => {
    if (phase.kind !== "chosen") return;

    const timeout = window.setTimeout(onClose, CHOSEN_HOLD_MS);

    return () => window.clearTimeout(timeout);
  }, [onClose, phase.kind]);

  const canChoose = Boolean(hero?.characterId && hero.name && world);

  const getErrorMessage = (code: string | undefined) => {
    if (code === "FACTION_WAR_ALREADY_PICKED") return t("errors.alreadyPicked");

    if (code === "FACTION_WAR_NOT_RUNNING") return t("errors.notRunning");

    return t("errors.generic");
  };

  const confirm = (faction: FactionWarFaction) => {
    if (!hero?.characterId || !hero.name || !world) return;

    setPhase({ kind: "choosing", faction });
    pick.mutate(
      {
        pathParams: { warId: war.id },
        data: {
          faction,
          characterId: hero.characterId,
          characterName: hero.name,
          world,
        },
      },
      {
        onSuccess: (updatedWar) => {
          queryClient.setQueryData(CURRENT_FACTION_WAR_QUERY_KEY, updatedWar);
          setPhase({ kind: "chosen", faction });
        },
        onError: (error) => {
          const code = getApiErrorStringField(error, "code");

          setPhase({
            kind: "confirming",
            faction,
            error: getErrorMessage(code),
          });

          // Another device may have picked already; show the server's answer.
          if (code === "FACTION_WAR_ALREADY_PICKED") {
            void queryClient.invalidateQueries({
              queryKey: CURRENT_FACTION_WAR_QUERY_KEY,
            });
          }
        },
      },
    );
  };

  // Escape steps back, then puts the screen away.
  const handleEscape = () => {
    if (phase.kind === "confirming") setPhase({ kind: "idle" });
    else if (phase.kind === "idle") onDismiss();
    else if (phase.kind === "chosen") onClose();
  };

  const emblem = (faction: FactionWarFaction) =>
    getFactionWarAssetUrl(war.id, faction, "emblem") ?? undefined;

  return (
    <FactionWarStage warId={war.id} state={phase.kind} onEscape={handleEscape}>
      {PICK_SCREEN_FACTIONS.map((faction) => (
        <FactionWarPickSide
          key={faction}
          warId={war.id}
          faction={faction}
          emphasis={getEmphasis(faction, phase, hovered)}
          motion={motion}
          players={getFactionTotal(war, faction)?.players ?? null}
          bonus={getFactionUnderdogBonus(war, faction)}
          disabled={!canChoose || phase.kind !== "idle"}
          onHoverChange={setHovered}
          onChoose={(chosen) =>
            setPhase({ kind: "confirming", faction: chosen, error: null })
          }
        />
      ))}
      <FactionWarHeader
        eyebrow={t("pick.eyebrow", {
          endsAt: formatFactionWarLastDay(war.endsAt),
        })}
        title={t("pick.title")}
      >
        <p className="ll-fw-rules">
          {canChoose ? t("pick.rules") : t("pick.noCharacter")}
        </p>
      </FactionWarHeader>
      {phase.kind === "idle" ? (
        <FactionWarPlateButton
          warId={war.id}
          label={t("pick.dismiss")}
          onClick={onDismiss}
        />
      ) : null}
      {phase.kind === "confirming" && hero && world ? (
        <FactionWarPickConfirm
          faction={phase.faction}
          emblemSrc={emblem(phase.faction)}
          characterName={hero.name}
          world={world}
          pending={pick.isPending}
          error={phase.error}
          onConfirm={() => confirm(phase.faction)}
          onBack={() => setPhase({ kind: "idle" })}
        />
      ) : null}
      {phase.kind === "chosen" ? (
        <FactionWarPickChosen
          faction={phase.faction}
          emblemSrc={emblem(phase.faction)}
        />
      ) : null}
    </FactionWarStage>
  );
};
