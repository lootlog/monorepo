import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  characterAurasControllerGetAuras,
  type CharacterAurasResponseDto,
  getCharacterAurasControllerGetAurasQueryKey,
  getCharacterAurasControllerGetOwnAuraQueryKey,
  type OwnCharacterAuraResponseDto,
  useCharacterAurasControllerGetAuras,
} from "@lootlog/client/main";
import type {
  CharacterAuraId,
  CharacterAurasChanged,
} from "@lootlog/schema/character-aura";
import { useSocket } from "@/contexts/socket-context";
import { readGameClientBootstrap } from "@/lib/game-client-bootstrap";
import { auraRuntimeAdapter } from "@/lib/margonem-runtime/adapters/aura-runtime-adapter";
import { subscribeCharacterTipUpdates } from "@/lib/margonem-runtime/adapters/tooltip-runtime-adapter";
import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";
import {
  characterAuraRenderer,
  HERO_AURA_KEY,
} from "../character-aura-renderer";
import { applyCharacterAuraChanges } from "../character-aura-changes";
import { resolveCharacterAuraTargets } from "../character-aura-targets";
import { auraMark, CharacterAuraTooltip } from "../engine/tooltip";
import { useOwnCharacterAura } from "./use-own-character-aura";

/**
 * Auras change rarely and arrive live; the refresh catches up on a change
 * lost while disconnected or announced to an older gateway.
 */
const AURAS_REFRESH_INTERVAL_MS = 5 * 60_000;

/**
 * Shows every aura on the map: the hero's own as soon as it is chosen, and
 * the auras of other players by the Margonem account they play. Auras exist
 * only on the NI canvas.
 */
export const useCharacterAuras = () => {
  const available = auraRuntimeAdapter.isAvailable();
  const heroAccountId = useGameStore((state) => state.game?.hero.accountId);
  const othersById = useOthersStore((state) => state.othersById);
  const { data: own } = useOwnCharacterAura();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

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

  // A change patches the list in place, so no player refetches it.
  useEffect(() => {
    if (!available || !socket) return;

    const onChanged = (change: CharacterAurasChanged) => {
      queryClient.setQueryData<CharacterAurasResponseDto>(
        getCharacterAurasControllerGetAurasQueryKey(),
        (current) => applyCharacterAuraChanges(current, change),
      );

      // The hero follows the User's own aura, which an admin may have revoked.
      const heroAccount = useGameStore.getState().game?.hero.accountId;
      const ownKey = getCharacterAurasControllerGetOwnAuraQueryKey();

      const ownAura =
        queryClient.getQueryData<OwnCharacterAuraResponseDto>(ownKey)?.auraId;

      const heroChange = change.auras.find(
        ({ gameAccountId }) => gameAccountId === heroAccount,
      );

      if (heroChange && heroChange.auraId !== ownAura)
        void queryClient.invalidateQueries({ queryKey: ownKey });
    };

    socket.on("character-auras.changed", onChanged);

    return () => {
      socket.off("character-auras.changed", onChanged);
    };
  }, [available, socket, queryClient]);

  const heroAura = own?.canChange ? own.auraId : null;

  const targets = resolveCharacterAuraTargets({
    listed: list?.auras ?? [],
    heroAccountId,
    heroAura,
    othersById,
  });

  const accountAuras = useRef(targets.byAccount);
  const drawn = useRef<ReadonlyMap<string, CharacterAuraId>>(new Map());
  // The hero's tip mark follows its own aura once its account is known;
  // before that the listed auras may mark it, so it is rebuilt every time.
  const heroMark = useRef<string | null>(null);

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

    // Cached tips keep the old mark until they are rebuilt, so every
    // character whose aura appeared, changed or went away gets its tip rebuilt.
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

    const nextHeroMark = `${heroAccountId}:${heroAura}`;

    const heroChanged =
      heroAccountId === undefined || heroMark.current !== nextHeroMark;

    heroMark.current = nextHeroMark;
    drawn.current = targets.byCharacter;

    auraRuntimeAdapter.refreshTips(changed, heroChanged);
  }, [available, targets, heroAccountId, heroAura]);

  useEffect(() => () => characterAuraRenderer.setTargets(new Map()), []);
};
