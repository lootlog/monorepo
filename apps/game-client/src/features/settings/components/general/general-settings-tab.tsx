import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/store/settings.store";
import { useTimersStore } from "@/store/timers.store";
import { FC, useState } from "react";

const MAX_REMOVE_TIMER_AFTER_MS = 120000; // 2 minutes

export const GeneralSettingsTab: FC = () => {
  const {
    removeTimerAfterMs,
    setRemoveTimerAfterMs,
    compactMode,
    timersGrouping,
    timersUnderBag,
    toggleCompactMode,
    toggleTimersGrouping,
    toggleTimersUnderBag,
  } = useTimersStore();
  const { allowWorldSelection, toggleAllowWorldSelection } = useSettingsStore();

  const [inputValue, setInputValue] = useState<string>(
    (removeTimerAfterMs / 1000).toString()
  );

  const handleRemoveTimerAfterMsChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setInputValue(value);

    if (value === "") {
      setRemoveTimerAfterMs(0);
      return;
    }

    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setRemoveTimerAfterMs(0);
      return;
    }

    if (num < 0 || num > MAX_REMOVE_TIMER_AFTER_MS / 1000) {
      setRemoveTimerAfterMs(MAX_REMOVE_TIMER_AFTER_MS);
      setInputValue((MAX_REMOVE_TIMER_AFTER_MS / 1000).toString());
      return;
    }

    setRemoveTimerAfterMs(num * 1000);
  };

  return (
    <div className="ll-w-full ll-pt-2">
      <h2>Ustawienia ogólne</h2>
      <p className=" ll-text-gray-400">
        Skonfiguruj ogólne ustawienia dotyczące działania dodatku w grze.
      </p>
      <div className="ll-mb-4 ll-mt-4">
        <Checkbox
          value={allowWorldSelection ? "1" : "0"}
          checked={allowWorldSelection}
          onChange={toggleAllowWorldSelection}
          id="allow-world-selection"
        >
          Pozwalaj na wybór świata - nie działa na zgrupowanych timerach
        </Checkbox>
      </div>
      <div className="ll-mb-4 ll-mt-4">
        <label className="ll-font-semibold ll-mb-4">Ustawienia timerów</label>
        <div className="checkbox-custom c-checkbox ll-mt-2">
          <input
            id="compact-mode-toggle"
            type="checkbox"
            value={compactMode ? "1" : "0"}
            checked={compactMode}
            onChange={toggleCompactMode}
          />
          <label htmlFor="compact-mode-toggle">Tryb kompaktowy</label>
        </div>
        <div className="checkbox-custom c-checkbox">
          <input
            id="timers-grouping-toggle"
            type="checkbox"
            value={timersGrouping ? "1" : "0"}
            checked={timersGrouping}
            onChange={toggleTimersGrouping}
          />
          <label htmlFor="timers-grouping-toggle">
            Grupowanie timerów (łączy timery z różnych lootlogów w jeden)
          </label>
        </div>
        <div className="checkbox-custom c-checkbox">
          <input
            id="timers-under-bag-toggle"
            type="checkbox"
            value={timersUnderBag ? "1" : "0"}
            checked={timersUnderBag}
            onChange={toggleTimersUnderBag}
          />
          <label htmlFor="timers-under-bag-toggle">Timery pod torbami</label>
        </div>
      </div>

      <div className="ll-mb-4 ll-mt-4">
        <label className="ll-font-semibold">
          Czas usunięcia timera po wyzerowaniu (w sekundach):
        </label>
        <div className="ll-w-8 ll-mt-2">
          <Input
            type="text"
            value={inputValue}
            max={120}
            onChange={handleRemoveTimerAfterMsChange}
          />
        </div>
      </div>
    </div>
  );
};
