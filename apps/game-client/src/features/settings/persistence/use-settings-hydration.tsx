/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- the settings persistence layer is the I/O boundary for catalog-validated document JSON; values are typed by the catalog when read through selectors. */
import { useEffect, useRef } from "react";
import { isObjectRecord } from "@lootlog/schema/records";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { migrateHotkeysState, useHotkeysStore } from "@/store/hotkeys.store";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import { useSettingsStore } from "@/store/settings.store";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import { TIMERS_STORAGE_KEY, useTimersStore } from "@/store/timers.store";
import { decodeTimerSettings } from "@/store/timer-settings-codec";
import { GLOBAL_TIMER_SETTINGS_KEY } from "@/store/timer-settings-sync";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import {
  createDetectorSettings,
  createNotificationsSettings,
} from "@/lib/game-account-preferences";
import { getGuildIds } from "@/lib/api/generated-helpers";
import {
  areSettingsValuesEqual,
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

/** Projects user-scoped timer documents into the timers store. */
export const applyTimerDocuments = (documents: SettingsDocuments) => {
  const decoded = decodeTimerSettings({
    generalConfig: selectSettingsValue(documents, "timers.generalConfig"),
    alwaysVisibleExpiredTimers: selectSettingsValue(
      documents,
      "timers.alwaysVisibleExpiredTimers",
    ),
    timerFiltersEnabled: selectSettingsValue(
      documents,
      "timers.timerFiltersEnabled",
    ),
    colorFiltersEnabled: selectSettingsValue(
      documents,
      "timers.colorFiltersEnabled",
    ),
    timersSortOrder: selectSettingsValue(documents, "timers.timersSortOrder"),
    displayConfig: selectSettingsValue(
      documents,
      "appearance.timers.displayConfig",
    ),
    customColors: selectSettingsValue(
      documents,
      "appearance.timers.customColors",
    ),
    timersColors: selectSettingsValue(
      documents,
      "appearance.timers.timersColors",
    ),
    defaultColorNames: selectSettingsValue(
      documents,
      "appearance.timers.defaultColorNames",
    ),
    overriddenDefaultColors: selectSettingsValue(
      documents,
      "appearance.timers.overriddenDefaultColors",
    ),
    hiddenDefaultColors: selectSettingsValue(
      documents,
      "appearance.timers.hiddenDefaultColors",
    ),
  });

  const store = useTimersStore.getState();
  const updatedAt = documents.domains.timers?.updatedAt;

  const next: Partial<TimersProjection> = {
    generalConfig: { ...store.generalConfig, ...decoded.generalConfig },
    displayConfig: { ...store.displayConfig, ...decoded.displayConfig },
    alwaysVisibleExpiredTimers:
      decoded.alwaysVisibleExpiredTimers ?? store.alwaysVisibleExpiredTimers,
    timerFiltersEnabled:
      decoded.timerFiltersEnabled ?? store.timerFiltersEnabled,
    colorFiltersEnabled:
      decoded.colorFiltersEnabled ?? store.colorFiltersEnabled,
    timersSortOrder: decoded.timersSortOrder ?? store.timersSortOrder,
    customColors: decoded.customColors ?? store.customColors,
    timersColors: decoded.timersColors ?? store.timersColors,
    defaultColorNames: decoded.defaultColorNames ?? store.defaultColorNames,
    overriddenDefaultColors:
      decoded.overriddenDefaultColors ?? store.overriddenDefaultColors,
    hiddenDefaultColors:
      decoded.hiddenDefaultColors ?? store.hiddenDefaultColors,
  };

  if (updatedAt) next.updatedAt = Date.parse(updatedAt);

  setTimersStateIfChanged(next);
  setGuildTimerLists(
    GLOBAL_TIMER_SETTINGS_KEY,
    selectSettingsValue(documents, "timers.hiddenTimers"),
    selectSettingsValue(documents, "timers.pinnedTimers"),
  );
};

type TimersState = ReturnType<typeof useTimersStore.getState>;

type TimersProjection = Pick<
  TimersState,
  | "updatedAt"
  | "generalConfig"
  | "displayConfig"
  | "alwaysVisibleExpiredTimers"
  | "timerFiltersEnabled"
  | "colorFiltersEnabled"
  | "timersSortOrder"
  | "customColors"
  | "timersColors"
  | "defaultColorNames"
  | "overriddenDefaultColors"
  | "hiddenDefaultColors"
>;

/**
 * Writes only the keys whose value changed, so a refetched document with the
 * same content leaves store identities (and their subscribers) untouched.
 */
const setTimersStateIfChanged = (next: Partial<TimersProjection>) => {
  const store = useTimersStore.getState();
  const changed: Partial<TimersProjection> = {};

  // SAFETY: `next` is built from TimersProjection keys only.
  for (const key of Object.keys(next) as (keyof TimersProjection)[]) {
    if (!areSettingsValuesEqual(store[key], next[key])) {
      Object.assign(changed, { [key]: next[key] });
    }
  }

  if (Object.keys(changed).length > 0) useTimersStore.setState(changed);
};

const setGuildTimerLists = (
  key: string,
  hiddenTimers: string[],
  pinnedTimers: string[],
) => {
  const store = useTimersStore.getState();

  const changed: Partial<Pick<TimersState, "hiddenTimers" | "pinnedTimers">> =
    {};

  if (!areSettingsValuesEqual(store.hiddenTimers[key], hiddenTimers)) {
    changed.hiddenTimers = { ...store.hiddenTimers, [key]: hiddenTimers };
  }

  if (!areSettingsValuesEqual(store.pinnedTimers[key], pinnedTimers)) {
    changed.pinnedTimers = { ...store.pinnedTimers, [key]: pinnedTimers };
  }

  if (Object.keys(changed).length > 0) useTimersStore.setState(changed);
};

/** Projects one guild's timer document into the per-guild lists. */
export const applyGuildTimerDocuments = (
  guildId: string,
  documents: SettingsDocuments,
) => {
  setGuildTimerLists(
    guildId,
    selectSettingsValue(documents, "timers.hiddenTimers"),
    selectSettingsValue(documents, "timers.pinnedTimers"),
  );
};

const applyProjections = (documents: SettingsDocuments) => {
  applyTimerDocuments(documents);

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

const readPersistedTimersState = () => {
  try {
    const raw = localStorage.getItem(TIMERS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    return isObjectRecord(parsed) ? parsed.state : null;
  } catch {
    return null;
  }
};

const readLocalSnapshot = () => {
  return {
    timers: readPersistedTimersState(),
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
    if (!guildDocuments) return;

    for (const [guildId, documents] of Object.entries(guildDocuments.guilds)) {
      applyGuildTimerDocuments(guildId, documents);
    }
  }, [guildDocuments]);

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
