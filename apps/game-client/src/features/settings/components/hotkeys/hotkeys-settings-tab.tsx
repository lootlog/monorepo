import { SettingsKeybindField } from "@/components/settings/settings-keybind-field";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/game.store";
import {
  HOTKEY_ACTIONS,
  HOTKEY_CATEGORY_KEYS,
  formatBindingParts,
  isDefaultBinding,
  useHotkeysStore,
  type HotkeyAction,
  type HotkeyActionConfig,
  type HotkeyBinding,
  type HotkeyCategory,
} from "@/store/hotkeys.store";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const groupedActions = new Map<HotkeyCategory, HotkeyActionConfig[]>();

for (const config of HOTKEY_ACTIONS) {
  const actions = groupedActions.get(config.category);

  if (actions) actions.push(config);
  else groupedActions.set(config.category, [config]);
}

const categories = Array.from(groupedActions);

const HOTKEY_CONTROL_CLASS_NAME = "ll:w-48";

export const HotkeysSettingsTab = () => {
  const gameInterface = useGameStore((state) => state.game?.interface);
  const { bindings, setBinding, resetBinding, resetAll } = useHotkeysStore();

  const [capturingAction, setCapturingAction] = useState<HotkeyAction | null>(
    null,
  );

  const [captureError, setCaptureError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!capturingAction) return;

    const saveBinding = (binding: HotkeyBinding) => {
      if (!setBinding(capturingAction, binding)) {
        setCaptureError(t("settings.hotkeys.conflict"));

        return;
      }

      setCaptureError(null);
      setCapturingAction(null);
    };

    const handleCapture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const ignoredKeys = ["Shift", "Control", "Alt", "Meta"];

      if (ignoredKeys.includes(event.key)) return;

      if (event.key === "Escape") {
        setCapturingAction(null);

        return;
      }

      saveBinding({
        type: "keyboard",
        key: event.key.length === 1 ? event.key.toUpperCase() : event.key,
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
      });
    };

    const handleMouseCapture = (event: MouseEvent) => {
      if (event.button !== 1 && event.button !== 3 && event.button !== 4) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      saveBinding({
        type: "mouse",
        button: event.button,
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey,
      });
    };

    window.addEventListener("keydown", handleCapture, { capture: true });
    window.addEventListener("mousedown", handleMouseCapture, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleCapture, { capture: true });
      window.removeEventListener("mousedown", handleMouseCapture, {
        capture: true,
      });
    };
  }, [capturingAction, setBinding, t]);

  return (
    <SettingsTabLayout>
      {categories.map(([category, actions], index) => (
        <SettingsSection
          key={category}
          controlId={index === 0 ? "hotkeys" : undefined}
          title={t(HOTKEY_CATEGORY_KEYS[category])}
        >
          {actions.map((config) => {
            if (config.action === "map-ping" && gameInterface !== "ni") {
              return null;
            }

            const binding = bindings[config.action];
            const isCapturing = capturingAction === config.action;
            const actionLabel = t(config.labelKey);
            const error = isCapturing ? captureError : null;

            return (
              <SettingsRow
                key={config.action}
                label={actionLabel}
                description={
                  error ? (
                    <span className="ll:text-red-400">{error}</span>
                  ) : (
                    t(config.descriptionKey)
                  )
                }
                controlClassName={HOTKEY_CONTROL_CLASS_NAME}
              >
                <SettingsKeybindField
                  keys={formatBindingParts(binding)}
                  capturing={isCapturing}
                  captureLabel={t("settings.hotkeys.capture")}
                  label={t("settings.hotkeys.changeLabel", {
                    action: actionLabel,
                  })}
                  modified={!isDefaultBinding(config.action, binding)}
                  resetLabel={t("common:actions.reset")}
                  onCaptureToggle={() => {
                    setCaptureError(null);
                    setCapturingAction(isCapturing ? null : config.action);
                  }}
                  onReset={() => resetBinding(config.action)}
                />
              </SettingsRow>
            );
          })}
        </SettingsSection>
      ))}
      <SettingsSection title={t("settings.hotkeys.restoreDefaultsTitle")}>
        <SettingsRow
          label={t("settings.hotkeys.restoreDefaultsLabel")}
          description={t("settings.hotkeys.restoreDefaultsDescription")}
        >
          <Button variant="outline" size="sm" onClick={resetAll} type="button">
            {t("common:actions.restore")}
          </Button>
        </SettingsRow>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
