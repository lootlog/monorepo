import { Checkbox } from "@/components/ui/checkbox";
import { useSettingsStore } from "@/store/settings.store";
import { FC } from "react";

export const GeneralSettingsTab: FC = () => {
  const { allowWorldSelection, toggleAllowWorldSelection } = useSettingsStore();

  return (
    <div className="ll:w-full ll:pt-2">
      <h2 className="ll:text-sm">Ustawienia ogólne</h2>
      <p className=" ll:text-gray-400">
        Skonfiguruj ogólne ustawienia dotyczące działania dodatku w grze.
      </p>
      <div className="ll:mb-4 ll:mt-4">
        <Checkbox
          value={allowWorldSelection ? "1" : "0"}
          checked={allowWorldSelection}
          onChange={toggleAllowWorldSelection}
          id="allow-world-selection"
        >
          Pozwalaj na wybór świata - nie działa na zgrupowanych timerach
        </Checkbox>
      </div>
    </div>
  );
};
