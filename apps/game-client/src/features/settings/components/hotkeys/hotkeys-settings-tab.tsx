import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Button } from "@/components/ui/button";
import {
  HOTKEY_ACTIONS,
  HOTKEY_CATEGORY_KEYS,
  formatBinding,
  useHotkeysStore,
  type HotkeyAction,
  type HotkeyActionConfig,
  type HotkeyBinding,
  type HotkeyCategory,
} from "@/store/hotkeys.store";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const groupedActions = HOTKEY_ACTIONS.reduce<
  Record<HotkeyCategory, HotkeyActionConfig[]>
>(
  (acc, config) => {
    (acc[config.category] ??= []).push(config);
    return acc;
  },
  {} as Record<HotkeyCategory, HotkeyActionConfig[]>,
);

const categories = Object.entries(groupedActions) as [
  HotkeyCategory,
  HotkeyActionConfig[],
][];

const HOTKEY_CONTROL_CLASS_NAME = "ll:w-44";

export const HotkeysSettingsTab = () => {
  const { bindings, setBinding, resetBinding, resetAll } = useHotkeysStore();
  const [capturingAction, setCapturingAction] = useState<HotkeyAction | null>(
    null,
  );
  const { t } = useTranslation();

  useEffect(() => {
    if (!capturingAction) return;

    const handleCapture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const ignoredKeys = ["Shift", "Control", "Alt", "Meta"];
      if (ignoredKeys.includes(event.key)) return;

      if (event.key === "Escape") {
        setCapturingAction(null);
        return;
      }

      const binding: HotkeyBinding = {
        key: event.key.length === 1 ? event.key.toUpperCase() : event.key,
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
      };

      setBinding(capturingAction, binding);
      setCapturingAction(null);
    };

    window.addEventListener("keydown", handleCapture, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleCapture, { capture: true });
    };
  }, [capturingAction, setBinding]);

  return (
    <SettingsTabLayout
      title={t("settings.hotkeys.title")}
      description={t("settings.hotkeys.description")}
    >
      <div className="ll:flex ll:flex-col ll:gap-4">
        {categories.map(([category, actions]) => (
          <SettingsSection
            key={category}
            title={t(HOTKEY_CATEGORY_KEYS[category])}
          >
            {actions.map((config) => {
              const binding = bindings[config.action];
              const isCapturing = capturingAction === config.action;

              return (
                <SettingsControlRow
                  key={config.action}
                  label={t(config.labelKey)}
                  description={t(config.descriptionKey)}
                  controlClassName={HOTKEY_CONTROL_CLASS_NAME}
                >
                  <div className="ll:flex ll:w-full ll:items-center ll:justify-end ll:gap-1.5">
                    <Button
                      className={`ll:min-w-0 ll:flex-1 ll:px-2 ll:text-[10px] ${
                        isCapturing
                          ? "ll:border-blue-400 ll:bg-blue-400/10 ll:text-blue-400 ll:hover:bg-blue-400/20"
                          : ""
                      }`}
                      onClick={() =>
                        setCapturingAction(isCapturing ? null : config.action)
                      }
                      type="button"
                    >
                      {isCapturing
                        ? t("settings.hotkeys.capture")
                        : formatBinding(binding)}
                    </Button>
                    <Button
                      className="ll:px-2 ll:text-[10px]"
                      onClick={() => resetBinding(config.action)}
                      type="button"
                      variant="ghost"
                    >
                      {t("common:actions.reset")}
                    </Button>
                  </div>
                </SettingsControlRow>
              );
            })}
          </SettingsSection>
        ))}
        <SettingsSection title={t("settings.hotkeys.resetTitle")}>
          <SettingsControlRow
            label={t("settings.hotkeys.restoreDefaultsLabel")}
            description={t("settings.hotkeys.restoreDefaultsDescription")}
            controlClassName="ll:w-28"
          >
            <Button
              onClick={resetAll}
              className="ll:w-full ll:px-2"
              type="button"
            >
              {t("settings.hotkeys.restoreButton")}
            </Button>
          </SettingsControlRow>
        </SettingsSection>
      </div>
    </SettingsTabLayout>
  );
};
