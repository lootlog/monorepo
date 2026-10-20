import { useEffect } from "react";
import type { RuntimeOther } from "@/lib/margonem-runtime/runtime.types";
import { runtimeEventPipeline } from "@/lib/margonem-runtime/runtime-event-pipeline";
import { refreshCharacterTooltips } from "@/lib/margonem-tooltips/patcher";
import { characterTooltipTransforms } from "@/lib/margonem-tooltips/registry";
import { useAnimationEffects } from "@/hooks/use-animation-effects";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { useOthersStore } from "@/store/others.store";
import { championAuraController } from "./champion-aura-controller";
import { createChampionTooltipTransform } from "./faction-war-champion-tooltip";
import { selectVisibleChampions } from "./faction-war-champions";
import { useHideOtherChampions } from "./faction-war-preferences";
import { useFactionWarChampions } from "./use-faction-war-champions";

const NO_OTHERS: Readonly<Record<string, RuntimeOther>> = Object.freeze({});

/**
 * Lights up the last war's champions in game: a ring of their faction on the
 * ground and a crest under their nick in tips. With no champions it neither
 * follows other players nor registers anything with the game.
 */
export const useFactionWarChampionHighlight = (): void => {
  const gameInitialized = useGlobalStore((state) =>
    Boolean(state.gameState.gameInitialized),
  );

  const runtimeInterface = useGameStore((state) => state.game?.interface);
  const heroId = useGameStore((state) => state.game?.hero.characterId);
  const { warId, factions } = useFactionWarChampions();
  const [hideOthers] = useHideOtherChampions();
  const animate = useAnimationEffects();
  const active = gameInitialized && warId !== null && factions.size > 0;
  const tipsActive = active && !hideOthers;

  const othersById = useOthersStore((state) =>
    active && !hideOthers ? state.othersById : NO_OTHERS,
  );

  const champions = selectVisibleChampions({
    factions: active ? factions : new Map(),
    heroId,
    otherIds: Object.keys(othersById),
    hideOthers,
  });

  useEffect(() => {
    championAuraController.sync({
      warId,
      runtimeInterface,
      champions,
      animate,
    });
  }, [animate, champions, runtimeInterface, warId]);

  useEffect(() => () => championAuraController.dispose(), []);

  // Tips of other players only: the hero's own tip has no Lootlog sections.
  useEffect(() => {
    if (!tipsActive || !warId) return;

    const unregister = characterTooltipTransforms.register(
      createChampionTooltipTransform(warId, factions),
    );

    refreshCharacterTooltips();

    return () => {
      unregister();
      refreshCharacterTooltips();
    };
  }, [factions, tipsActive, warId]);

  // SI rewrites a player's tip on full `other` updates; put the crest back.
  useEffect(() => {
    if (!tipsActive || runtimeInterface !== "si") return;

    return runtimeEventPipeline.subscribeProjected((envelope) => {
      const others = envelope.raw?.other;

      if (!others) return;

      const championIds = Object.keys(others).filter((id) => factions.has(id));

      if (championIds.length > 0) refreshCharacterTooltips(championIds);
    });
  }, [factions, runtimeInterface, tipsActive]);
};
