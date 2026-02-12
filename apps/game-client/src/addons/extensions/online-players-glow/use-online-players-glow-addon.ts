import {
  GLOW_RETRY_DELAY_MS,
  MAX_GLOW_RETRIES_PER_OTHER,
  WHO_IS_HERE_BADGE_STYLE_ID,
  WHO_IS_HERE_LOOTLOG_CLASS,
} from "@/addons/extensions/online-players-glow/online-players-glow.constants";
import {
  getOnlinePlayersGlowSettingsSnapshot,
  type OnlinePlayersGlowSettingsSnapshot,
  useOnlinePlayersGlowStore,
} from "@/addons/extensions/online-players-glow/online-players-glow.store";
import {
  buildPresenceKey,
  resolveLootlogGuildActivityStatus,
  resolveLootlogGuildStatusColor,
  stripTipSectionFromHtml,
  syncLootlogSectionInTipHtml,
} from "@/addons/extensions/online-players-glow/online-players-glow-tip.utils";
import {
  readPlayerTipTuple,
  writePlayerTipTuple,
} from "@/addons/utils/player-tip";
import { usePlayersPresence } from "@/features/online-players/hooks/use-players-presence";
import { useGuilds } from "@/hooks/api/use-guilds";
import { Game } from "@/lib/game";
import { useGlobalStore } from "@/store/global.store";
import { useOthersStore, type TrackedOtherPlayer } from "@/store/others.store";
import { useEffect, useMemo, useRef } from "react";
import type {
  AddonPresenceData,
  AppliedGlow,
  ApiWithCallbacks,
  CharacterTipUpdatePayload,
  EngineWithApiData,
  EngineWithWhoIsHereTips,
  RuntimeOther,
  WhoIsHereEntry,
  WhoIsHereTipCharacter,
} from "./online-players-glow.types";

const readCurrentGlowColor = (other: RuntimeOther): string | undefined => {
  if (typeof other.whoIsHere === "string") {
    return other.whoIsHere;
  }

  if (typeof other.d?.whoIsHere === "string") {
    return other.d.whoIsHere;
  }

  return undefined;
};

const restoreGlow = (entry: AppliedGlow) => {
  if (entry.hadWhoIsHere) {
    entry.other.whoIsHere = entry.previousWhoIsHere;
  } else {
    delete entry.other.whoIsHere;
  }

  if (entry.other.d) {
    if (entry.hadDataWhoIsHere) {
      entry.other.d.whoIsHere = entry.previousDataWhoIsHere;
    } else {
      delete entry.other.d.whoIsHere;
    }
  }

  const restoredColor = readCurrentGlowColor(entry.other);
  if (restoredColor && entry.other.whoIsHereGlow?.updateColor) {
    entry.other.whoIsHereGlow.updateColor(restoredColor);
  }

  entry.other.updateWhoIsHereGlow?.();
};

const setGlowColor = (other: RuntimeOther, color: string) => {
  other.onUpdate?.whoIsHere?.(color);

  if (typeof other.whoIsHere === "function") {
    other.whoIsHere(color);
  } else {
    other.whoIsHere = color;
  }

  if (other.d) {
    other.d.whoIsHere = color;
  }

  other.whoIsHereGlow?.updateColor?.(color);
  other.updateWhoIsHereGlow?.();
};

const applyGlow = (other: RuntimeOther, color: string): AppliedGlow => {
  const hadWhoIsHere = Object.prototype.hasOwnProperty.call(other, "whoIsHere");
  const previousWhoIsHere = other.whoIsHere;
  const hadDataWhoIsHere = Boolean(
    other.d && Object.prototype.hasOwnProperty.call(other.d, "whoIsHere"),
  );
  const previousDataWhoIsHere = other.d?.whoIsHere;

  setGlowColor(other, color);

  return {
    previousWhoIsHere,
    hadWhoIsHere,
    previousDataWhoIsHere,
    hadDataWhoIsHere,
    other,
  };
};

const resolveDesiredGlowColor = (
  usesLootlog: boolean,
  glowSettings: OnlinePlayersGlowSettingsSnapshot,
): string | null => {
  if (usesLootlog) {
    return glowSettings.lootlogGlowEnabled
      ? glowSettings.lootlogGlowColor
      : null;
  }

  return glowSettings.nonLootlogGlowEnabled
    ? glowSettings.nonLootlogGlowColor
    : null;
};

const getApi = (): ApiWithCallbacks | null => {
  const api = (window as Window & { API?: ApiWithCallbacks }).API;
  return api ?? null;
};

const buildLookupIds = (other: RuntimeOther, runtimeId?: string): string[] => {
  const lookupIds: string[] = [];
  if (typeof runtimeId === "string" && runtimeId.trim().length > 0) {
    lookupIds.push(runtimeId);
  }

  const characterId = other.d?.id;
  if (characterId !== undefined && characterId !== null) {
    lookupIds.push(String(characterId));
  }

  return Array.from(new Set(lookupIds));
};

const resolveWhoIsHereEntry = (
  engine: EngineWithWhoIsHereTips | null,
  lookupIds: string[],
): WhoIsHereEntry | null => {
  for (const lookupId of lookupIds) {
    const entry = engine?.whoIsHere?.getWhoIsHereOther?.(lookupId);
    if (entry) {
      return entry;
    }
  }

  return null;
};

export const ensureWhoIsHereLootlogBadgeStyle = (): void => {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById(WHO_IS_HERE_BADGE_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = WHO_IS_HERE_BADGE_STYLE_ID;
  style.textContent = `
.who-is-here .one-other.${WHO_IS_HERE_LOOTLOG_CLASS} .name .inner::after{
  content:"LL";
  display:inline-flex;
  align-items:center;
  justify-content:center;
  margin-left:6px;
  padding:0 4px;
  height:12px;
  border-radius:999px;
  border:1px solid rgba(213,191,116,0.6);
  background:rgba(213,191,116,0.15);
  color:#d5bf74;
  font-size:9px;
  font-weight:700;
  line-height:1;
  vertical-align:middle;
}
`;

  document.head.appendChild(style);
};

export const removeWhoIsHereLootlogBadgeStyle = (): void => {
  if (typeof document === "undefined") {
    return;
  }

  document.getElementById(WHO_IS_HERE_BADGE_STYLE_ID)?.remove();
};

export const syncWhoIsHereLootlogMarkerForOther = (
  other: RuntimeOther,
  runtimeId: string | undefined,
  usesLootlog: boolean,
  engineParam?: EngineWithWhoIsHereTips,
): void => {
  const lookupIds = buildLookupIds(other, runtimeId);
  if (lookupIds.length === 0) {
    return;
  }

  const engine =
    engineParam ??
    (window as Window & { Engine?: EngineWithWhoIsHereTips }).Engine ??
    null;

  const whoIsHereEntry = resolveWhoIsHereEntry(engine, lookupIds);
  const whoIsHereRoot = whoIsHereEntry?.$;
  if (!whoIsHereRoot) {
    return;
  }

  if (usesLootlog) {
    whoIsHereRoot.addClass?.(WHO_IS_HERE_LOOTLOG_CLASS);
    return;
  }

  whoIsHereRoot.removeClass?.(WHO_IS_HERE_LOOTLOG_CLASS);
};

const isWhoIsHereTipCharacter = (
  value: unknown,
): value is WhoIsHereTipCharacter => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    typeof (value as { createStrTip?: unknown }).createStrTip === "function" &&
    typeof (value as { getImg?: unknown }).getImg === "function"
  );
};

export const refreshWhoIsHereTipViewsForOther = (
  other: RuntimeOther,
  runtimeId?: string,
  engineParam?: EngineWithWhoIsHereTips,
): void => {
  const lookupIds = buildLookupIds(other, runtimeId);
  if (lookupIds.length === 0) {
    return;
  }

  const engine =
    engineParam ??
    (window as Window & { Engine?: EngineWithWhoIsHereTips }).Engine ??
    null;
  const whoIsHereOther = resolveWhoIsHereEntry(engine, lookupIds);
  const whoIsHereTipContainer = whoIsHereOther?.$?.find?.(".tip-container");

  const tipCharacterCandidates: unknown[] = [];
  for (const lookupId of lookupIds) {
    tipCharacterCandidates.push(engine?.others?.getById?.(lookupId));

    const numericId = Number(lookupId);
    if (!Number.isNaN(numericId)) {
      tipCharacterCandidates.push(engine?.others?.getById?.(numericId));
    }
  }
  tipCharacterCandidates.push(other);

  const tipCharacter = tipCharacterCandidates.find(isWhoIsHereTipCharacter);

  if (
    whoIsHereTipContainer &&
    typeof whoIsHereTipContainer.tip === "function" &&
    tipCharacter
  ) {
    tipCharacter.tipUpdate?.();
    engine?.whoIsHere?.createTipWrapper?.(whoIsHereTipContainer, tipCharacter);
  }

  const miniMapOtherController =
    engine?.miniMapController?.handHeldMiniMapController?.getMiniMapOtherController?.();

  let miniMapOther: unknown;
  if (miniMapOtherController) {
    for (const lookupId of lookupIds) {
      miniMapOther = miniMapOtherController.getObject?.(lookupId);
      if (miniMapOther) {
        break;
      }

      const numericId = Number(lookupId);
      if (!Number.isNaN(numericId)) {
        miniMapOther = miniMapOtherController.getObject?.(numericId);
        if (miniMapOther) {
          break;
        }
      }
    }
  }

  if (miniMapOther) {
    miniMapOtherController?.createTipToOther?.(miniMapOther);
  }
};

export const useOnlinePlayersGlowAddon = (enabled = true) => {
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const playersByRuntimeId = useOthersStore((s) => s.playersByRuntimeId);
  const { data: guilds } = useGuilds();

  const lootlogGlowEnabled = useOnlinePlayersGlowStore(
    (s) => s.lootlogGlowEnabled,
  );
  const lootlogGlowColor = useOnlinePlayersGlowStore((s) => s.lootlogGlowColor);
  const nonLootlogGlowEnabled = useOnlinePlayersGlowStore(
    (s) => s.nonLootlogGlowEnabled,
  );
  const nonLootlogGlowColor = useOnlinePlayersGlowStore(
    (s) => s.nonLootlogGlowColor,
  );

  const world = enabled && gameInitialized ? Game.getWorldName() : undefined;

  const [onlinePlayers] = usePlayersPresence(undefined, world, {
    includeAllJoinedGuilds: true,
  });

  const glowSettings = useMemo<OnlinePlayersGlowSettingsSnapshot>(() => {
    return {
      lootlogGlowEnabled,
      lootlogGlowColor,
      nonLootlogGlowEnabled,
      nonLootlogGlowColor,
    };
  }, [
    lootlogGlowEnabled,
    lootlogGlowColor,
    nonLootlogGlowEnabled,
    nonLootlogGlowColor,
  ]);

  const guildNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const guild of guilds ?? []) {
      map[guild.id] = guild.name;
    }
    return map;
  }, [guilds]);

  const userGuildIds = useMemo(() => {
    return new Set((guilds ?? []).map((guild) => guild.id));
  }, [guilds]);

  const addonPresenceByKey = useMemo(() => {
    const presenceGuildIdsByKey = new Map<string, Set<string>>();
    const guildStatusByGuildIdByPresenceKey = new Map<
      string,
      Record<string, { timersEnabled: boolean; lootEnabled: boolean }>
    >();

    for (const presences of Object.values(onlinePlayers)) {
      for (const presence of presences) {
        if (presence.status !== "online" || presence.platform !== "game") {
          continue;
        }

        const accountId = presence.player?.accountId;
        const playerCharacterId = presence.player?.characterId;
        if (!accountId || !playerCharacterId) {
          continue;
        }

        const presenceKey = `${accountId}-${playerCharacterId}`;
        const currentGuildIds =
          presenceGuildIdsByKey.get(presenceKey) ?? new Set<string>();

        const sourceGuildIds =
          presence.guildIds && presence.guildIds.length > 0
            ? presence.guildIds
            : presence.guildId
              ? [presence.guildId]
              : [];

        for (const sourceGuildId of sourceGuildIds) {
          if (sourceGuildId) {
            currentGuildIds.add(sourceGuildId);
          }
        }

        presenceGuildIdsByKey.set(presenceKey, currentGuildIds);

        if (presence.lootlogSettings?.guildStatusByGuildId) {
          const currentGuildStatusByGuildId =
            guildStatusByGuildIdByPresenceKey.get(presenceKey) ?? {};

          for (const [guildId, guildStatus] of Object.entries(
            presence.lootlogSettings.guildStatusByGuildId,
          )) {
            currentGuildStatusByGuildId[guildId] = {
              timersEnabled: guildStatus.timersEnabled === true,
              lootEnabled: guildStatus.lootEnabled === true,
            };
          }

          guildStatusByGuildIdByPresenceKey.set(
            presenceKey,
            currentGuildStatusByGuildId,
          );
        }
      }
    }

    const normalizedPresenceByKey = new Map<string, AddonPresenceData>();

    for (const [presenceKey, guildIdsSet] of presenceGuildIdsByKey.entries()) {
      const guildStatusByGuildId =
        guildStatusByGuildIdByPresenceKey.get(presenceKey);

      const guildIds = Array.from(guildIdsSet)
        .filter((guildId) => userGuildIds.has(guildId))
        .sort((a, b) => a.localeCompare(b));

      const guildEntries = guildIds.map((guildId) => {
        const status = resolveLootlogGuildActivityStatus(
          guildStatusByGuildId,
          guildId,
        );

        return {
          guildId,
          label: guildNameById[guildId] ?? guildId,
          status,
          color: resolveLootlogGuildStatusColor(status),
        };
      });

      normalizedPresenceByKey.set(presenceKey, {
        guildEntries,
      });
    }

    return normalizedPresenceByKey;
  }, [guildNameById, onlinePlayers, userGuildIds]);

  const addonPlayerKeys = useMemo(() => {
    return new Set(addonPresenceByKey.keys());
  }, [addonPresenceByKey]);

  const trackedOthers = useMemo(() => {
    return Object.values(playersByRuntimeId);
  }, [playersByRuntimeId]);

  const trackedPresenceKeys = useMemo(() => {
    return new Set(
      trackedOthers.map((other) =>
        buildPresenceKey(other.accountId, other.characterId),
      ),
    );
  }, [trackedOthers]);

  const appliedGlowRef = useRef<Map<string, AppliedGlow>>(new Map());
  const appliedTipRuntimeIdsRef = useRef<Set<string>>(new Set());
  const addonPlayerKeysRef = useRef<Set<string>>(new Set());
  const addonPresenceByKeyRef = useRef<Map<string, AddonPresenceData>>(
    new Map(),
  );
  const trackedOthersRef = useRef<TrackedOtherPlayer[]>([]);
  const trackedPresenceKeysRef = useRef<Set<string>>(new Set());
  const syncGlowsRef = useRef<(() => void) | null>(null);
  const glowRetryTimeoutRef = useRef<number | null>(null);
  const glowRetryCountByRuntimeIdRef = useRef<Map<string, number>>(new Map());
  const glowSettingsRef = useRef<OnlinePlayersGlowSettingsSnapshot>(
    getOnlinePlayersGlowSettingsSnapshot(),
  );

  useEffect(() => {
    addonPlayerKeysRef.current = addonPlayerKeys;
    addonPresenceByKeyRef.current = addonPresenceByKey;
    trackedOthersRef.current = trackedOthers;
    trackedPresenceKeysRef.current = trackedPresenceKeys;
    glowSettingsRef.current = glowSettings;
    syncGlowsRef.current?.();
  }, [
    addonPlayerKeys,
    addonPresenceByKey,
    trackedOthers,
    trackedPresenceKeys,
    glowSettings,
  ]);

  useEffect(() => {
    if (!enabled || !gameInitialized || Game.interface !== "ni") {
      return;
    }

    const api = getApi();
    const engine = window.Engine as EngineWithApiData | undefined;
    const eventName = engine?.apiData?.AFTER_CHARACTER_TIP_UPDATE;

    if (!api || !eventName) {
      return;
    }

    const handleCharacterTipUpdate = (payload: CharacterTipUpdatePayload) => {
      if (!payload || typeof payload.text !== "string") {
        return;
      }

      const characterId = payload.object?.d?.id;
      const accountId = payload.object?.d?.account;

      if (characterId === undefined || accountId === undefined) {
        return;
      }

      const presenceKey = buildPresenceKey(
        String(accountId),
        String(characterId),
      );
      if (!trackedPresenceKeysRef.current.has(presenceKey)) {
        return;
      }

      const presenceData = addonPresenceByKeyRef.current.get(presenceKey);
      payload.text = syncLootlogSectionInTipHtml(
        payload.text,
        presenceData?.guildEntries,
      );
    };

    try {
      api.addCallbackToEvent(eventName, handleCharacterTipUpdate);
    } catch (error) {
      console.warn("Failed to subscribe to character tip updates:", error);
      return;
    }

    return () => {
      try {
        api.removeCallbackFromEvent(eventName, handleCharacterTipUpdate);
      } catch {
        // Event callback might already be removed by engine lifecycle.
      }
    };
  }, [enabled, gameInitialized]);

  useEffect(() => {
    if (!enabled || !gameInitialized || Game.interface !== "ni") {
      removeWhoIsHereLootlogBadgeStyle();
      return;
    }

    ensureWhoIsHereLootlogBadgeStyle();

    return () => {
      removeWhoIsHereLootlogBadgeStyle();
    };
  }, [enabled, gameInitialized]);

  useEffect(() => {
    const appliedGlow = appliedGlowRef.current;
    const appliedTipRuntimeIds = appliedTipRuntimeIdsRef.current;

    const clearAllGlows = () => {
      for (const entry of appliedGlow.values()) {
        restoreGlow(entry);
      }
      appliedGlow.clear();
    };

    const clearAllLootlogTipSections = () => {
      const others = window.Engine?.others?.check?.() as
        | Record<string, RuntimeOther>
        | undefined;
      if (!others) {
        return;
      }

      for (const [runtimeId, other] of Object.entries(others)) {
        syncWhoIsHereLootlogMarkerForOther(other, runtimeId, false);

        const tipTuple = readPlayerTipTuple(other);
        if (!tipTuple) {
          continue;
        }

        const nextTipHtml = stripTipSectionFromHtml(tipTuple[0]);
        if (nextTipHtml !== tipTuple[0]) {
          writePlayerTipTuple(other, [nextTipHtml, tipTuple[1], tipTuple[2]]);
          refreshWhoIsHereTipViewsForOther(other, runtimeId);
        }
      }

      appliedTipRuntimeIds.clear();
    };

    const scheduleGlowRetry = () => {
      if (glowRetryTimeoutRef.current !== null) {
        return;
      }

      glowRetryTimeoutRef.current = window.setTimeout(() => {
        glowRetryTimeoutRef.current = null;
        syncGlowsRef.current?.();
      }, GLOW_RETRY_DELAY_MS);
    };

    const syncGlows = () => {
      if (!enabled || !gameInitialized || Game.interface !== "ni") {
        clearAllGlows();
        clearAllLootlogTipSections();
        return;
      }

      const others = window.Engine?.others?.check?.() as
        | Record<string, RuntimeOther>
        | undefined;
      if (!others) {
        return;
      }

      const activeRuntimeIds = new Set<string>();
      const pendingGlowRuntimeIds = new Set<string>();
      const runtimeIdsWithUpdatedTips = new Set<string>();

      for (const trackedOther of trackedOthersRef.current) {
        const other = others[trackedOther.runtimeId];
        if (!other) {
          continue;
        }

        const presenceKey = buildPresenceKey(
          trackedOther.accountId,
          trackedOther.characterId,
        );
        const presenceData = addonPresenceByKeyRef.current.get(presenceKey);

        const tipTuple = readPlayerTipTuple(other);
        if (tipTuple) {
          const nextTipHtml = syncLootlogSectionInTipHtml(
            tipTuple[0],
            presenceData?.guildEntries,
          );
          if (nextTipHtml !== tipTuple[0]) {
            writePlayerTipTuple(other, [nextTipHtml, tipTuple[1], tipTuple[2]]);
            runtimeIdsWithUpdatedTips.add(trackedOther.runtimeId);
          }
          appliedTipRuntimeIds.add(trackedOther.runtimeId);
        }

        activeRuntimeIds.add(trackedOther.runtimeId);

        let currentApplied = appliedGlow.get(trackedOther.runtimeId);
        if (currentApplied && currentApplied.other !== other) {
          appliedGlow.delete(trackedOther.runtimeId);
          currentApplied = undefined;
        }

        const usesLootlog = addonPlayerKeysRef.current.has(presenceKey);
        syncWhoIsHereLootlogMarkerForOther(
          other,
          trackedOther.runtimeId,
          usesLootlog,
        );

        const desiredGlowColor = resolveDesiredGlowColor(
          usesLootlog,
          glowSettingsRef.current,
        );

        if (desiredGlowColor) {
          const currentGlowColor = readCurrentGlowColor(other);

          if (!currentApplied) {
            appliedGlow.set(
              trackedOther.runtimeId,
              applyGlow(other, desiredGlowColor),
            );
          } else if (currentGlowColor !== desiredGlowColor) {
            setGlowColor(other, desiredGlowColor);
          }

          if (!other.whoIsHereGlow) {
            const retryCount =
              glowRetryCountByRuntimeIdRef.current.get(
                trackedOther.runtimeId,
              ) ?? 0;

            if (retryCount < MAX_GLOW_RETRIES_PER_OTHER) {
              glowRetryCountByRuntimeIdRef.current.set(
                trackedOther.runtimeId,
                retryCount + 1,
              );
              pendingGlowRuntimeIds.add(trackedOther.runtimeId);
            }
          } else {
            glowRetryCountByRuntimeIdRef.current.delete(trackedOther.runtimeId);
          }

          continue;
        }

        if (currentApplied) {
          restoreGlow(currentApplied);
          appliedGlow.delete(trackedOther.runtimeId);
        }

        glowRetryCountByRuntimeIdRef.current.delete(trackedOther.runtimeId);
      }

      for (const [runtimeId, entry] of appliedGlow) {
        if (!activeRuntimeIds.has(runtimeId)) {
          restoreGlow(entry);
          appliedGlow.delete(runtimeId);
        }
      }

      for (const runtimeId of appliedTipRuntimeIds) {
        if (activeRuntimeIds.has(runtimeId)) {
          continue;
        }

        const other = others[runtimeId];
        if (other) {
          syncWhoIsHereLootlogMarkerForOther(other, runtimeId, false);

          const tipTuple = readPlayerTipTuple(other);
          if (tipTuple) {
            const nextTipHtml = stripTipSectionFromHtml(tipTuple[0]);
            if (nextTipHtml !== tipTuple[0]) {
              writePlayerTipTuple(other, [
                nextTipHtml,
                tipTuple[1],
                tipTuple[2],
              ]);
              runtimeIdsWithUpdatedTips.add(runtimeId);
            }
          }
        }

        appliedTipRuntimeIds.delete(runtimeId);
        glowRetryCountByRuntimeIdRef.current.delete(runtimeId);
      }

      for (const runtimeId of runtimeIdsWithUpdatedTips) {
        const other = others[runtimeId];
        if (other) {
          refreshWhoIsHereTipViewsForOther(other, runtimeId);
        }
      }

      if (pendingGlowRuntimeIds.size > 0) {
        scheduleGlowRetry();
      }
    };

    syncGlowsRef.current = syncGlows;
    syncGlows();

    return () => {
      if (glowRetryTimeoutRef.current !== null) {
        window.clearTimeout(glowRetryTimeoutRef.current);
        glowRetryTimeoutRef.current = null;
      }

      glowRetryCountByRuntimeIdRef.current.clear();
      syncGlowsRef.current = null;
      clearAllGlows();
      clearAllLootlogTipSections();
    };
  }, [enabled, gameInitialized]);
};

export const useAddonPlayersGlow = useOnlinePlayersGlowAddon;
