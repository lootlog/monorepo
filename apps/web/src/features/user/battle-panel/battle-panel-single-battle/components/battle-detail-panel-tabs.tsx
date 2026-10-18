import type { BattleDetailPanel } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-panel.store";
import { BATTLE_DETAIL_TABS_CLASS_NAME } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-layout";
import { Tabs, TabsList, TabsTrigger } from "@lootlog/ui/components/tabs";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type BattleDetailPanelTabsProps = {
  activePanel: BattleDetailPanel;
  panels: readonly BattleDetailPanel[];
  onActivePanelChange: (panel: BattleDetailPanel) => void;
};

/** The panels beside the battle as a strip of tabs pinned over them, like page tabs. */
export const BattleDetailPanelTabs: FC<BattleDetailPanelTabsProps> = ({
  activePanel,
  panels,
  onActivePanelChange,
}) => {
  const { t } = useTranslation();

  return (
    <Tabs
      value={activePanel}
      onValueChange={(panel: BattleDetailPanel) => onActivePanelChange(panel)}
      data-list-tile
      className={BATTLE_DETAIL_TABS_CLASS_NAME}
    >
      <TabsList
        variant="underline"
        aria-label={t("battlePanel.single.panels.label")}
        className="h-full"
      >
        {panels.map((panel) => (
          <TabsTrigger key={panel} value={panel}>
            {t(`battlePanel.single.panels.${panel}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
