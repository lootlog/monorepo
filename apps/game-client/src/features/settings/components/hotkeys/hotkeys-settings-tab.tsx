import {
  HOTKEY_ACTIONS,
  HOTKEY_CATEGORY_LABELS,
  formatBinding,
  useHotkeysStore,
  type HotkeyAction,
  type HotkeyActionConfig,
  type HotkeyBinding,
  type HotkeyCategory,
} from "@/store/hotkeys.store";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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

export const HotkeysSettingsTab = () => {
  const { bindings, setBinding, resetBinding, resetAll } = useHotkeysStore();
  const [capturingAction, setCapturingAction] = useState<HotkeyAction | null>(
    null,
  );

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
    <div className="ll:w-full ll:pt-2">
      <h2 className="ll:text-sm">Skróty klawiszowe</h2>
      <p className="ll:text-gray-400">
        Skonfiguruj skróty klawiszowe do otwierania okien.
      </p>

      <div className="ll:flex ll:flex-col ll:gap-4 ll:mt-4">
        {categories.map(([category, actions]) => (
          <div key={category} className="ll:flex ll:flex-col ll:gap-2">
            <h3 className="ll:text-xs ll:font-medium ll:text-gray-400 ll:uppercase ll:tracking-wide">
              {HOTKEY_CATEGORY_LABELS[category]}
            </h3>
            <div className="ll:flex ll:flex-col ll:gap-2">
              {actions.map((config) => {
                const binding = bindings[config.action];
                const isCapturing = capturingAction === config.action;

                return (
                  <div
                    key={config.action}
                    className="ll:flex ll:items-center ll:justify-between ll:gap-2"
                  >
                    <div className="ll:flex ll:flex-col ll:min-w-0">
                      <span className="ll:text-xs ll:text-white">
                        {config.label}
                      </span>
                      <span className="ll:text-[10px] ll:text-gray-400">
                        {config.description}
                      </span>
                    </div>
                    <div className="ll:flex ll:items-center ll:gap-1 ll:shrink-0">
                      <Button
                        onClick={() =>
                          setCapturingAction(isCapturing ? null : config.action)
                        }
                        className={`ll:px-2 ll:min-w-[100px] ll:text-[10px] ${
                          isCapturing
                            ? "ll:border-blue-400 ll:text-blue-400 ll:bg-blue-400/10 ll:hover:bg-blue-400/20"
                            : ""
                        }`}
                      >
                        {isCapturing
                          ? "Naciśnij klawisz..."
                          : formatBinding(binding)}
                      </Button>
                      <Button
                        onClick={() => resetBinding(config.action)}
                        className="ll:px-1.5 ll:text-[10px] ll:text-gray-400"
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="ll:border-t ll:border-gray-600 ll:pt-2 ll:mt-4">
        <Button onClick={resetAll} className="ll:px-2 ll:text-[10px]">
          Przywróć domyślne
        </Button>
      </div>
    </div>
  );
};
