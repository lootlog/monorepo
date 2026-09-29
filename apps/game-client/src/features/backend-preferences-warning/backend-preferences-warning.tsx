import { Option, Schema } from "effect";
import { Info } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { WarningWindow } from "@/components/warning-window/warning-window";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { storageKey } from "@/lib/storage-key";
import { useGlobalStore } from "@/store/global.store";
import { useWindowsStore } from "@/store/windows.store";

const STORAGE_KEY = storageKey("ll:backend-preferences-warning-dismissed");

/**
 * Where releases before server-side settings kept notification and detector
 * preferences. Only a browser whose copy still holds settings had something
 * that was not carried over; an empty `{"state":{}}` lost nothing.
 */
const LEGACY_PREFERENCES_KEYS = [
  storageKey("ll-notifications-state"),
  storageKey("ll-npc-detector-state"),
];

const LegacyPreferences = Schema.fromJsonString(
  Schema.Struct({ state: Schema.Record(Schema.String, Schema.Unknown) }),
);

const decodeLegacyPreferences = Schema.decodeUnknownOption(LegacyPreferences);

const holdsLegacyPreferences = (value: string | null) =>
  Option.match(decodeLegacyPreferences(value), {
    onNone: () => false,
    onSome: ({ state }) => Object.keys(state).length > 0,
  });

const hasLegacyLocalPreferences = () => {
  try {
    return LEGACY_PREFERENCES_KEYS.some((key) =>
      holdsLegacyPreferences(window.localStorage.getItem(key)),
    );
  } catch {
    return false;
  }
};

export const BackendPreferencesWarning: FC = () => {
  const { t } = useTranslation("backendPreferencesWarning");

  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );

  const open = useWindowsStore(
    (state) => state["backend-preferences-warning"].open,
  );

  const setOpen = useWindowsStore((state) => state.setOpen);
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);
  const [hasLegacyPreferences] = useState(hasLegacyLocalPreferences);

  const [dismissed, setDismissed] = useLocalStorage<boolean>(
    STORAGE_KEY,
    false,
    Schema.Boolean,
  );

  useEffect(() => {
    if (!gameInitialized || dismissed || !hasLegacyPreferences) return;

    setOpen("backend-preferences-warning", true);
  }, [dismissed, gameInitialized, hasLegacyPreferences, setOpen]);

  const handleClose = () => {
    setDismissed(true);
    setOpen("backend-preferences-warning", false);
  };

  const handleOpenSettings = () => {
    openAndFocus("settings", {
      activeTab: "detector",
      activeSubsection: "detector",
    });
    handleClose();
  };

  return (
    <WarningWindow
      id="backend-preferences-warning"
      open={open}
      title={t("window.title")}
      icon={Info}
      heading={t("content.title")}
      description={t("content.description")}
      primaryAction={{
        label: t("actions.review"),
        onClick: handleOpenSettings,
      }}
      onClose={handleClose}
    />
  );
};
