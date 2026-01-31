import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTimersStore } from "@/store/timers.store";
import { FC, useState } from "react";

const MAX_REMOVE_TIMER_AFTER_MS = 120000; // 2 minutes

export const TimersSettingsGeneral: FC = () => {
  const { generalConfig, setGeneralConfig, syncEnabled, setSyncEnabled } =
    useTimersStore();

  const [inputValue, setInputValue] = useState<string>(
    (generalConfig.removeTimerAfterMs / 1000).toString(),
  );

  const handleRemoveTimerAfterMsChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setInputValue(value);

    if (value === "") {
      setGeneralConfig({ ...generalConfig, removeTimerAfterMs: 0 });
      return;
    }

    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setGeneralConfig({ ...generalConfig, removeTimerAfterMs: 0 });
      return;
    }

    if (num < 0 || num > MAX_REMOVE_TIMER_AFTER_MS / 1000) {
      setGeneralConfig({
        ...generalConfig,
        removeTimerAfterMs: MAX_REMOVE_TIMER_AFTER_MS,
      });
      setInputValue((MAX_REMOVE_TIMER_AFTER_MS / 1000).toString());
      return;
    }

    setGeneralConfig({ ...generalConfig, removeTimerAfterMs: num * 1000 });
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-3">
      <div className="ll:flex ll:flex-col ll:gap-2">
        <div>
          <Label htmlFor="sync-enabled">Synchronizuj ustawienia</Label>
          <p className="ll:text-muted-foreground">
            Synchronizuje ustawienia timerów z serwerem.
          </p>
        </div>
        <Switch
          checked={syncEnabled ?? true}
          onCheckedChange={setSyncEnabled}
          id="sync-enabled"
        />
      </div>
      <div className="ll:flex ll:flex-col ll:gap-2">
        <div>
          <Label htmlFor="show-type">Grupuj timery</Label>
          <p className="ll:text-muted-foreground">
            Łączy timery z różnych lootlogów w jeden zbiorczy.
          </p>
        </div>
        <Switch
          checked={generalConfig.timersGrouping}
          onCheckedChange={(value) =>
            setGeneralConfig({ ...generalConfig, timersGrouping: value })
          }
          id="show-type"
        />
      </div>
      <div className="ll:flex ll:flex-col ll:gap-2">
        <div>
          <Label htmlFor="show-type">Timery pod torbami</Label>
          <p className="ll:text-muted-foreground">
            Wyświetla timery pod torbami zamiast w osobnym okienku.
          </p>
        </div>
        <Switch
          checked={generalConfig.timersUnderBag}
          onCheckedChange={(value) =>
            setGeneralConfig({ ...generalConfig, timersUnderBag: value })
          }
          id="show-type"
        />
      </div>
      <div className="ll:flex ll:flex-col ll:gap-2">
        <div>
          <Label htmlFor="compact-view">Widok kompaktowy</Label>
          <p className="ll:text-muted-foreground">
            Ukrywa nagłówek i stopkę timerów, pokazując tylko zawartość.
          </p>
        </div>
        <Switch
          checked={generalConfig.compactView}
          onCheckedChange={(value) =>
            setGeneralConfig({ ...generalConfig, compactView: value })
          }
          id="compact-view"
        />
      </div>
      <div className="ll:space-y-1">
        <Label>Odliczaj do</Label>
        <ToggleGroup
          type="single"
          size="xs"
          onValueChange={(value: "min" | "max") => {
            if (value) {
              setGeneralConfig({
                ...generalConfig,
                countdownMode: value,
              });
            }
          }}
          value={generalConfig.countdownMode}
        >
          <ToggleGroupItem value="max">Max</ToggleGroupItem>
          <ToggleGroupItem value="min" className="ll:text-nowrap">
            Min
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="ll:space-y-1">
        <Label className="ll:font-semibold">
          Czas usunięcia timera po wyzerowaniu (w sekundach)
        </Label>
        <div className="ll:w-8">
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
