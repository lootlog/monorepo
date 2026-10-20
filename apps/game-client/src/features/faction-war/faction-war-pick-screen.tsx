import {
  useFactionWarsControllerPickFaction,
  type FactionWarResponseDto,
} from "@lootlog/client/main";
import { getApiErrorStringField } from "@lootlog/client/transport";
import { createCachedFormatter } from "@lootlog/datetime";
import {
  FACTION_WAR_TIMEZONE,
  type FactionWarFaction,
} from "@lootlog/domain/faction-war";
import { useQueryClient } from "@tanstack/react-query";
import {
  useEffect,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { useAnimationEffects } from "@/hooks/use-animation-effects";
import { useGameStore } from "@/store/game.store";
import {
  getFactionWarAssetUrl,
  getFactionWarNeutralButtonUrl,
  getFactionWarSeamUrl,
} from "./faction-war-assets";
import { getFactionUnderdogBonus } from "./faction-war-pick-state";
import { FactionWarPickChosen } from "./faction-war-pick-chosen";
import { FactionWarPickConfirm } from "./faction-war-pick-confirm";
import {
  FactionWarPickSide,
  type FactionSideEmphasis,
} from "./faction-war-pick-side";
import { PICK_SCREEN_FACTIONS } from "./faction-war-presentation";
import { CURRENT_FACTION_WAR_QUERY_KEY } from "./use-current-faction-war";

type Phase =
  | { kind: "idle" }
  | { kind: "confirming"; faction: FactionWarFaction; error: string | null }
  | { kind: "choosing"; faction: FactionWarFaction }
  | { kind: "chosen"; faction: FactionWarFaction };

/** How long the chosen faction stays on screen before it closes. */
const CHOSEN_HOLD_MS = 2_600;

/** The screen fades in once its key art decoded, or after this at the latest. */
const READY_TIMEOUT_MS = 1_200;

const getEndDayFormatter = createCachedFormatter("pl-PL", {
  day: "numeric",
  month: "long",
});

/** `endsAt` is exclusive, so the last day of the war is the day before it. */
const formatLastDay = (endsAt: string) =>
  getEndDayFormatter(FACTION_WAR_TIMEZONE).format(
    new Date(Date.parse(endsAt) - 1),
  );

const getPlayers = (war: FactionWarResponseDto, faction: FactionWarFaction) =>
  war.totals.find((total) => total.faction === faction)?.players ?? null;

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

const useKeyArtReady = (warId: string) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const sources = PICK_SCREEN_FACTIONS.flatMap((faction) => [
      getFactionWarAssetUrl(warId, faction, "backdrop"),
      getFactionWarAssetUrl(warId, faction, "character"),
    ]).filter((source) => source !== null);

    const decodes = sources.map((source) => {
      const image = new Image();
      image.src = source;

      return image.decode().catch(() => undefined);
    });

    const timeout = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, READY_TIMEOUT_MS);

    void Promise.all(decodes).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [warId]);

  return ready;
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
  const ready = useKeyArtReady(war.id);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [hovered, setHovered] = useState<FactionWarFaction | null>(null);
  const hero = useGameStore((state) => state.game?.hero);
  const world = useGameStore((state) => state.game?.world);
  const pick = useFactionWarsControllerPickFaction();

  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

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

  // Game hotkeys must not fire while the player types or steps through the
  // screen; Escape steps back, then puts the screen away.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();

    if (event.key !== "Escape") return;

    if (phase.kind === "confirming") setPhase({ kind: "idle" });
    else if (phase.kind === "idle") onDismiss();
    else if (phase.kind === "chosen") onClose();
  };

  const emblem = (faction: FactionWarFaction) =>
    getFactionWarAssetUrl(war.id, faction, "emblem") ?? undefined;

  return (
    <div
      ref={overlayRef}
      className="ll-fw-overlay"
      data-ready={ready}
      data-state={phase.kind}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ll-fw-heading"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="ll-fw-stage">
        {PICK_SCREEN_FACTIONS.map((faction) => (
          <FactionWarPickSide
            key={faction}
            warId={war.id}
            faction={faction}
            emphasis={getEmphasis(faction, phase, hovered)}
            motion={motion}
            players={getPlayers(war, faction)}
            bonus={getFactionUnderdogBonus(war, faction)}
            disabled={!canChoose || phase.kind !== "idle"}
            onHoverChange={setHovered}
            onChoose={(chosen) =>
              setPhase({ kind: "confirming", faction: chosen, error: null })
            }
          />
        ))}
        <img
          className="ll-fw-seam"
          src={getFactionWarSeamUrl(war.id) ?? undefined}
          alt=""
          aria-hidden="true"
        />
        <header className="ll-fw-header">
          <div className="ll-fw-eyebrow">
            {t("pick.eyebrow", { endsAt: formatLastDay(war.endsAt) })}
          </div>
          <h2 id="ll-fw-heading" className="ll-fw-heading">
            {t("pick.title")}
          </h2>
          <p className="ll-fw-rules">
            {canChoose ? t("pick.rules") : t("pick.noCharacter")}
          </p>
        </header>
        {phase.kind === "idle" ? (
          <button type="button" className="ll-fw-dismiss" onClick={onDismiss}>
            <img
              className="ll-fw-cta-plate"
              src={getFactionWarNeutralButtonUrl(war.id) ?? undefined}
              alt=""
              draggable={false}
            />
            <span className="ll-fw-cta-label">{t("pick.dismiss")}</span>
          </button>
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
      </div>
    </div>
  );
};
