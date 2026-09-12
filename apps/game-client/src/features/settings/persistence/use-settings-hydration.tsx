/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- the settings persistence layer is the I/O boundary for catalog-validated document JSON; values are typed by the catalog when read through selectors. */
import { useEffect, useRef } from "react";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { migrateHotkeysState, useHotkeysStore } from "@/store/hotkeys.store";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import { useSettingsStore } from "@/store/settings.store";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import { readLegacyTimerSnapshot } from "@/features/timers/settings/legacy-timer-snapshot";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import {
  createDetectorSettings,
  createNotificationsSettings,
} from "@/lib/game-account-preferences";
import { getGuildIds } from "@/lib/api/generated-helpers";
import {
  hasStoredSettingsValue,
  selectSettingsValue,
  type SettingsDocuments,
} from "./settings-documents";
import {
  enqueueSettingsPatch,
  readCurrentSettingsDocuments,
} from "./settings-patch-client";
import {
  markSettingsImportDone,
  planSettingsImport,
  readSettingsImportState,
} from "./settings-import";
import {
  useGuildTimersDocuments,
  useSettingsDocuments,
} from "./use-settings-documents";

const applyProjections = (documents: SettingsDocuments) => {
  if (hasStoredSettingsValue(documents, "controls.hotkeys")) {
    useHotkeysStore
      .getState()
      .applyBindings(
        migrateHotkeysState(
          { bindings: selectSettingsValue(documents, "controls.hotkeys") },
          8,
        ).bindings,
      );
  }

  if (hasStoredSettingsValue(documents, "general.allowWorldSelection")) {
    useSettingsStore
      .getState()
      .setAllowWorldSelection(
        selectSettingsValue(documents, "general.allowWorldSelection"),
      );
  }

  if (hasStoredSettingsValue(documents, "gameData.battlePanel")) {
    useBattlePanelStore
      .getState()
      .setBattleCollectionEnabled(
        selectSettingsValue(documents, "gameData.battlePanel")
          .isBattleCollectionEnabled ?? false,
      );
  }
};

const readLocalSnapshot = () => {
  return {
    timers: readLegacyTimerSnapshot(),
    hotkeys: useHotkeysStore.getState().bindings,
    allowWorldSelection: useSettingsStore.getState().allowWorldSelection,
    battlePanel: {
      isBattleCollectionEnabled:
        useBattlePanelStore.getState().isBattleCollectionEnabled,
    },
  };
};

/**
 * Keeps the settings documents, the feature stores that mirror them, and the
 * one-time import of browser-only settings in sync. Mounted once per session.
 */
export const useSettingsHydration = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );

  const accountId = useGameStore((state) => state.game?.hero.accountId);
  const characterId = useGameStore((state) => state.game?.hero.characterId);
  const documents = useSettingsDocuments();

  const {
    data: guilds,
    isFetched: areGuildsFetched,
    isFetching: areGuildsFetching,
  } = useUsersControllerGetCurrentUserAccessibleGuilds();

  const guildIds = getGuildIds(guilds);

  const guildDocumentsQuery = useGuildTimersDocuments(guildIds);
  const guildDocuments = guildDocumentsQuery.data;

  const areGuildDocumentsReady =
    guildIds.length === 0 || guildDocumentsQuery.isFetched;

  const importedRef = useRef(false);
  const seededAccountsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!documents.data || !areGuildsFetched || areGuildsFetching) return;

    // The import decides per guild list whether the server already holds one,
    // so it waits for the guild documents the same way it waits for the user's.
    if (!importedRef.current && areGuildDocumentsReady) {
      importedRef.current = true;

      const plan = planSettingsImport({
        documents: documents.data,
        guildDocuments,
        local: readLocalSnapshot(),
        done: readSettingsImportState().done,
        accessibleGuildIds: guildIds,
        hasCharacterScope: Boolean(accountId && characterId),
      });

      const pendingDomains = new Set(plan.domains);

      for (const patch of plan.patches) {
        enqueueSettingsPatch({
          ...patch,
          afterSave: () => {
            markSettingsImportDone(patch.domain);
            pendingDomains.delete(patch.domain);
          },
        });
      }

      for (const domain of plan.domains) {
        if (!plan.patches.some((patch) => patch.domain === domain)) {
          markSettingsImportDone(domain);
        }
      }
    }

    applyProjections(readCurrentSettingsDocuments() ?? documents.data);
  }, [
    accountId,
    areGuildDocumentsReady,
    areGuildsFetched,
    areGuildsFetching,
    characterId,
    documents.data,
    guildDocuments,
    guildIds,
  ]);

  useEffect(() => {
    if (
      !gameInitialized ||
      !accountId ||
      !documents.data ||
      !areGuildsFetched ||
      areGuildsFetching ||
      seededAccountsRef.current.has(accountId)
    ) {
      return;
    }

    const needsNotifications = !hasStoredSettingsValue(
      documents.data,
      "notifications.presentation",
    );

    const needsDetector = !hasStoredSettingsValue(
      documents.data,
      "gameData.detector",
    );

    if (!needsNotifications && !needsDetector) return;
    seededAccountsRef.current.add(accountId);

    if (needsNotifications) {
      enqueueSettingsPatch({
        domain: "notifications",
        scopeType: "GAME_ACCOUNT",
        set: { presentation: createNotificationsSettings(guildIds) },
      });
    }

    if (needsDetector) {
      enqueueSettingsPatch({
        domain: "gameData",
        scopeType: "GAME_ACCOUNT",
        set: { detector: createDetectorSettings() },
      });
    }
  }, [
    accountId,
    areGuildsFetched,
    areGuildsFetching,
    documents.data,
    gameInitialized,
    guildIds,
  ]);

  useEffect(() => {
    if (!gameInitialized || !accountId || !documents.isFetched) return;
    npcsDetectionProcessor.flushPending(accountId);
  }, [accountId, documents.isFetched, gameInitialized]);
};
