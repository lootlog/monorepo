import { Checkbox } from "@/components/ui/checkbox";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import { FC } from "react";

export const BattlePanelSettingsTab: FC = () => {
  const { isBattleCollectionEnabled, toggleBattleCollection } =
    useBattlePanelStore();

  return (
    <div className="ll:w-full ll:pt-2">
      <h2 className="ll:text-sm">Ustawienia panelu walk</h2>
      <p className="ll:text-gray-400">
        Skonfiguruj ustawienia dotyczące zbierania danych walk w grze.
      </p>
      <div className="ll:mb-4 ll:mt-4">
        <Checkbox
          value={isBattleCollectionEnabled ? "1" : "0"}
          checked={isBattleCollectionEnabled}
          onChange={toggleBattleCollection}
          id="battle-collection-enabled"
        >
          Włącz zbieranie walk
        </Checkbox>
      </div>
    </div>
  );
};
