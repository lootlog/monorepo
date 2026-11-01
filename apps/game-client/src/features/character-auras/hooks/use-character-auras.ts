import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  characterAurasControllerGetAuras,
  characterAurasControllerLinkGameAccount,
  type CharacterAurasResponseDto,
  getCharacterAurasControllerGetAurasQueryKey,
  getCharacterAurasControllerGetOwnAuraQueryKey,
  useCharacterAurasControllerGetAuras,
} from "@lootlog/client/main";
import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import { readGameClientBootstrap } from "@/lib/game-client-bootstrap";
import { auraRuntimeAdapter } from "@/lib/margonem-runtime/adapters/aura-runtime-adapter";
import { subscribeCharacterTipUpdates } from "@/lib/margonem-runtime/adapters/tooltip-runtime-adapter";
import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";
import {
  characterAuraRenderer,
  HERO_AURA_KEY,
} from "../character-aura-renderer";
import { resolveCharacterAuraTargets } from "../character-aura-targets";
import { auraMark, CharacterAuraTooltip } from "../engine/tooltip";
import { useOwnCharacterAura } from "./use-own-character-aura";

/** Auras change rarely; a newly chosen one reaches other players within this time. */
const AURAS_REFRESH_INTERVAL_MS = 5 * 60_000;

/**
 * Shows every aura on the map: the hero's own as soon as it is chosen, and
 * the auras of other players by the Margonem account they play. Auras exist
 * only on the NI canvas.
 */
export const useCharacterAuras = () => {
  const queryClient = useQueryClient();
  const available = auraRuntimeAdapter.isAvailable();
  const heroAccountId = useGameStore((state) => state.game?.hero.accountId);
  const othersById = useOthersStore((state) => state.othersById);
  const { data: own } = useOwnCharacterAura();

  const listKey = getCharacterAurasControllerGetAurasQueryKey();

  const { data: list } = useCharacterAurasControllerGetAuras({
    query: {
      queryKey: listKey,
      // The first list comes with the startup request; later ones on refresh.
      queryFn: async ({ signal }) =>
        (await readGameClientBootstrap<CharacterAurasResponseDto>(listKey)) ??
        characterAurasControllerGetAuras({ signal }),
      enabled: available,
      refetchInterval: AURAS_REFRESH_INTERVAL_MS,
      refetchOnWindowFocus: false,
      staleTime: AURAS_REFRESH_INTERVAL_MS,
    },
  });

  const heroAura = own?.canChange ? own.auraId : null;

  const targets = resolveCharacterAuraTargets({
    listed: list?.auras ?? [],
    heroAccountId,
    heroAura,
    othersById,
  });

  const accountAuras = useRef(targets.byAccount);
  const drawn = useRef<ReadonlyMap<string, CharacterAuraId>>(new Map());

  // Other players learn which accounts show the aura from the account list.
  const linkedAccount = useRef<string | null>(null);

  useEffect(() => {
    if (
      !available ||
      !heroAccountId ||
      !heroAura ||
      !own ||
      own.gameAccountIds.includes(heroAccountId) ||
      linkedAccount.current === heroAccountId
    ) {
      return;
    }

    linkedAccount.current = heroAccountId;
    characterAurasControllerLinkGameAccount({ gameAccountId: heroAccountId })
      .then((updated) => {
        queryClient.setQueryData(
          getCharacterAurasControllerGetOwnAuraQueryKey(),
          updated,
        );

        return queryClient.invalidateQueries({
          queryKey: getCharacterAurasControllerGetAurasQueryKey(),
        });
      })
      .catch((error) => {
        linkedAccount.current = null;
        console.warn("[CharacterAuras] Failed to link the account:", error);
      });
  }, [available, heroAccountId, heroAura, own, queryClient]);

  const hasAuras = targets.byCharacter.size > 0;

  // Installed before the targets apply, so tips rebuilt for them get the mark.
  useEffect(() => {
    if (!available || !hasAuras) return;
    const layer = auraRuntimeAdapter.getTipLayer();
    const tooltip = layer ? new CharacterAuraTooltip(layer) : null;

    const unsubscribe = subscribeCharacterTipUpdates((update) => {
      const accountId = auraRuntimeAdapter.getTipOwnerAccountId(update.object);
      const auraId = accountId && accountAuras.current.get(accountId);

      if (auraId) update.text += auraMark(auraId);
    });

    return () => {
      unsubscribe?.();
      tooltip?.dispose();
    };
  }, [available, hasAuras]);

  useEffect(() => {
    if (!available) return;
    accountAuras.current = targets.byAccount;
    characterAuraRenderer.setTargets(targets.byCharacter);

    // Cached tips keep the old mark until they are rebuilt, so every other
    // whose aura appeared, changed or went away gets its tip rebuilt; the
    // hero's tip is rebuilt every time.
    const changed = new Set<string>();

    for (const key of new Set([
      ...drawn.current.keys(),
      ...targets.byCharacter.keys(),
    ])) {
      if (
        key !== HERO_AURA_KEY &&
        drawn.current.get(key) !== targets.byCharacter.get(key)
      ) {
        changed.add(key);
      }
    }

    drawn.current = targets.byCharacter;
    auraRuntimeAdapter.refreshTips(changed);
  }, [available, targets]);

  useEffect(() => () => characterAuraRenderer.setTargets(new Map()), []);
};
