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
import { legacyAuraRuntimeAdapter } from "@/lib/margonem-runtime/adapters/legacy-aura-runtime-adapter";
import { subscribeCharacterTipUpdates } from "@/lib/margonem-runtime/adapters/tooltip-runtime-adapter";
import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";
import { useSettingsStore } from "@/store/settings.store";
import { canvasAuraRenderer } from "../canvas-aura-surface";
import { applyCharacterAuraChanges } from "../character-aura-changes";
import { HERO_AURA_KEY } from "../character-aura-renderer";
import {
  characterAuraKey,
  ownAuraOf,
  resolveCharacterAuraTargets,
} from "../character-aura-targets";
import { auraMark, CharacterAuraTooltip } from "../engine/tooltip";
import { legacyAuraRenderer } from "../legacy-aura-surface";
import { NEARBY_AURA_LIMIT, resolveMapAuraMode } from "../map-aura-mode";
import { useOwnCharacterAura } from "./use-own-character-aura";

/**
 * Auras change rarely and arrive live; the refresh catches up on a change
 * lost while disconnected or announced to an older gateway.
 */
const AURAS_REFRESH_INTERVAL_MS = 5 * 60_000;

/**
 * Shows every aura on the map: the hero's own as soon as it is chosen, and
 * the auras of other players' characters. NI draws
 * them on its map canvas and marks character tips; SI draws them beside its
 * character elements.
 */
export const useCharacterAuras = () => {
  const canvas = auraRuntimeAdapter.isAvailable();

  const renderer = canvas
    ? canvasAuraRenderer
    : legacyAuraRuntimeAdapter.isAvailable()
      ? legacyAuraRenderer
      : null;

  const available = renderer !== null;
  const heroAccountId = useGameStore((state) => state.game?.hero.accountId);

  const heroCharacterId = useGameStore((state) => state.game?.hero.characterId);

  const hero =
    heroAccountId && heroCharacterId
      ? { accountId: heroAccountId, characterId: heroCharacterId }
      : undefined;

  const heroKey = hero && characterAuraKey(hero);
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
      const current = useGameStore.getState().game?.hero;
      const ownKey = getCharacterAurasControllerGetOwnAuraQueryKey();

      const own = queryClient.getQueryData<OwnCharacterAuraResponseDto>(ownKey);

      const heroChange = change.auras.find(
        ({ gameAccountId, characterId }) =>
          gameAccountId === current?.accountId &&
          characterId === current.characterId,
      );

      if (heroChange && heroChange.auraId !== ownAuraOf(own, current))
        void queryClient.invalidateQueries({ queryKey: ownKey });
    };

    socket.on("character-auras.changed", onChanged);

    return () => {
      socket.off("character-auras.changed", onChanged);
    };
  }, [available, socket, queryClient]);

  const heroAura = own?.canChange ? ownAuraOf(own, hero) : null;

  const mapAuras = resolveMapAuraMode(
    useSettingsStore((state) => state.mapAuras),
  );

  const targets = resolveCharacterAuraTargets({
    listed: list?.auras ?? [],
    hero,
    heroAura,
    othersById,
  });

  const tipAuras = useRef(targets.byKey);
  const drawn = useRef<ReadonlyMap<string, CharacterAuraId>>(new Map());
  // The hero's tip mark follows its own aura once its character is known;
  // before that the listed auras may mark it, so it is rebuilt every time.
  const heroMark = useRef<string | null>(null);

  const hasAuras = targets.byCharacter.size > 0;

  useEffect(() => {
    renderer?.setOthersLimit(mapAuras === "nearby" ? NEARBY_AURA_LIMIT : null);
  }, [renderer, mapAuras]);

  // Installed before the targets apply, so tips rebuilt for them get the mark.
  useEffect(() => {
    if (!canvas || !hasAuras) return;
    const layer = auraRuntimeAdapter.getTipLayer();
    const tooltip = layer ? new CharacterAuraTooltip(layer) : null;

    const unsubscribe = subscribeCharacterTipUpdates((update) => {
      const owner = auraRuntimeAdapter.getTipOwner(update.object);
      const auraId = owner && tipAuras.current.get(characterAuraKey(owner));

      if (auraId) update.text += auraMark(auraId);
    });

    return () => {
      unsubscribe?.();
      tooltip?.dispose();
    };
  }, [canvas, hasAuras]);

  useEffect(() => {
    if (!renderer) return;
    tipAuras.current = targets.byKey;
    // Tips still mark the auras the map does not draw.
    renderer.setTargets(mapAuras === "off" ? new Map() : targets.byCharacter);

    if (!canvas) return;

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

    const nextHeroMark = heroKey ? `${heroKey}:${heroAura}` : null;

    const heroChanged =
      nextHeroMark === null || heroMark.current !== nextHeroMark;

    heroMark.current = nextHeroMark;
    drawn.current = targets.byCharacter;

    auraRuntimeAdapter.refreshTips(changed, heroChanged);
  }, [renderer, canvas, targets, mapAuras, heroKey, heroAura]);

  useEffect(() => {
    if (!renderer) return;

    return () => renderer.setTargets(new Map());
  }, [renderer]);
};
