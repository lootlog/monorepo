import {
  removePlayerTipSection,
  upsertPlayerTipSection,
} from "@/addons/utils/player-tip";
import { useGuilds } from "@/hooks/api/use-guilds";
import { Game } from "@/lib/game";
import { useGlobalStore } from "@/store/global.store";
import { useSettingsStore } from "@/store/settings.store";
import { useEffect, useMemo, useRef } from "react";
import { usePlayersPresence } from "./use-players-presence";

const GLOW_COLOR = "#00d1ff";
const GLOW_REFRESH_INTERVAL_MS = 250;
const TOOLTIP_SECTION_ID = "lootlog-presence";

type RuntimeOther = {
  d?: {
    id?: string | number;
    account?: string | number;
  };
  tip?: unknown;
  whoIsHere?: string;
  updateWhoIsHereGlow?: () => void;
};

type AppliedGlow = {
  previousWhoIsHere: RuntimeOther["whoIsHere"];
  hadWhoIsHere: boolean;
  other: RuntimeOther;
};

const restoreGlow = (entry: AppliedGlow) => {
  if (entry.hadWhoIsHere) {
    entry.other.whoIsHere = entry.previousWhoIsHere;
  } else {
    delete entry.other.whoIsHere;
  }

  entry.other.updateWhoIsHereGlow?.();
};

const applyGlow = (other: RuntimeOther): AppliedGlow => {
  const hadWhoIsHere = Object.prototype.hasOwnProperty.call(other, "whoIsHere");
  const previousWhoIsHere = other.whoIsHere;

  other.whoIsHere = GLOW_COLOR;
  other.updateWhoIsHereGlow?.();

  return {
    previousWhoIsHere,
    hadWhoIsHere,
    other,
  };
};

type AddonPresenceData = {
  guildLabels: string[];
};

const escapeHtml = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const buildLootlogTipSection = (
  usesLootlog: boolean,
  guildLabels: string[],
): string => {
  const usesLootlogLabel = usesLootlog ? "Tak" : "Nie";
  const guildsLabel =
    usesLootlog && guildLabels.length > 0
      ? guildLabels.map((guildLabel) => escapeHtml(guildLabel)).join(", ")
      : "-";

  return `<div class="info_tooltip_cont ll-lootlog-tip"><div class="line"></div><div class="info_tooltip_loot">Lootlog:<div class="value">${usesLootlogLabel}</div></div><div class="info_tooltip_loot">Guilds:<div class="value">${guildsLabel}</div></div></div>`;
};

export const useAddonPlayersGlow = (enabled = true) => {
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const { guildIdByCharId, worldByGuildId } = useSettingsStore();
  const { data: guilds } = useGuilds();

  const characterId =
    enabled && gameInitialized ? String(Game.hero.id) : undefined;
  const defaultWorld =
    enabled && gameInitialized ? Game.getWorldName() : undefined;
  const guildId = characterId ? guildIdByCharId[characterId] : undefined;
  const world = guildId ? worldByGuildId[guildId] : defaultWorld;

  const [onlinePlayers] = usePlayersPresence(guildId, world, {
    includeAllJoinedGuilds: true,
  });

  const guildNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const guild of guilds ?? []) {
      map[guild.id] = guild.name;
    }
    return map;
  }, [guilds]);

  const addonPresenceByKey = useMemo(() => {
    const presenceGuildIdsByKey = new Map<string, Set<string>>();

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
        const currentGuildIds = presenceGuildIdsByKey.get(presenceKey) ?? new Set();
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
      }
    }

    const normalizedPresenceByKey = new Map<string, AddonPresenceData>();
    for (const [presenceKey, guildIdsSet] of presenceGuildIdsByKey.entries()) {
      const guildIds = Array.from(guildIdsSet).sort((a, b) => a.localeCompare(b));
      const guildLabels = guildIds.map((id) => guildNameById[id] ?? id);

      normalizedPresenceByKey.set(presenceKey, {
        guildLabels,
      });
    }

    return normalizedPresenceByKey;
  }, [guildNameById, onlinePlayers]);

  const addonPlayerKeys = useMemo(() => {
    return new Set(addonPresenceByKey.keys());
  }, [addonPresenceByKey]);

  const appliedGlowRef = useRef<Map<string, AppliedGlow>>(new Map());
  const addonPlayerKeysRef = useRef<Set<string>>(new Set());
  const addonPresenceByKeyRef = useRef<Map<string, AddonPresenceData>>(new Map());
  const syncGlowsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    addonPlayerKeysRef.current = addonPlayerKeys;
    addonPresenceByKeyRef.current = addonPresenceByKey;
    syncGlowsRef.current?.();
  }, [addonPlayerKeys, addonPresenceByKey]);

  useEffect(() => {
    const appliedGlow = appliedGlowRef.current;

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

      for (const other of Object.values(others)) {
        removePlayerTipSection(other, TOOLTIP_SECTION_ID);
      }
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

      const activeCharacterIds = new Set<string>();

      for (const [otherId, other] of Object.entries(others)) {
        if (!other?.d) {
          continue;
        }

        const otherCharacterId = String(other.d.id ?? otherId);
        const otherAccountId = String(other.d.account ?? "");
        const presenceKey = `${otherAccountId}-${otherCharacterId}`;
        const presenceData = addonPresenceByKeyRef.current.get(presenceKey);
        const tooltipHtml = buildLootlogTipSection(
          Boolean(presenceData),
          presenceData?.guildLabels ?? [],
        );

        upsertPlayerTipSection(other, TOOLTIP_SECTION_ID, tooltipHtml);

        activeCharacterIds.add(otherCharacterId);

        let currentApplied = appliedGlow.get(otherCharacterId);
        if (currentApplied && currentApplied.other !== other) {
          appliedGlow.delete(otherCharacterId);
          currentApplied = undefined;
        }

        const shouldGlow = addonPlayerKeysRef.current.has(presenceKey);

        if (shouldGlow) {
          if (!currentApplied) {
            appliedGlow.set(otherCharacterId, applyGlow(other));
          } else if (other.whoIsHere !== GLOW_COLOR) {
            other.whoIsHere = GLOW_COLOR;
            other.updateWhoIsHereGlow?.();
          }
          continue;
        }

        if (currentApplied) {
          restoreGlow(currentApplied);
          appliedGlow.delete(otherCharacterId);
        }
      }

      for (const [glowCharacterId] of appliedGlow) {
        if (!activeCharacterIds.has(glowCharacterId)) {
          appliedGlow.delete(glowCharacterId);
        }
      }
    };

    syncGlowsRef.current = syncGlows;
    syncGlows();
    const intervalId = window.setInterval(syncGlows, GLOW_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      syncGlowsRef.current = null;
      clearAllGlows();
      clearAllLootlogTipSections();
    };
  }, [enabled, gameInitialized]);
};
