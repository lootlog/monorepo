import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import type { BattleDetailPanel } from "@/features/user/battle-panel/battle-panel-single-battle/components/use-battle-detail-view";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type BattleDetailPanelTabsProps = {
  activePanel: BattleDetailPanel;
  panels: readonly BattleDetailPanel[];
  onActivePanelChange: (panel: BattleDetailPanel) => void;
};

export const BattleDetailPanelTabs: FC<BattleDetailPanelTabsProps> = ({
  activePanel,
  panels,
  onActivePanelChange,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatedToggleGroup
      label={t("battlePanel.single.panels.label")}
      value={activePanel}
      onValueChange={onActivePanelChange}
      options={panels.map((panel) => ({
        value: panel,
        label: t(`battlePanel.single.panels.${panel}`),
      }))}
      className="w-full"
    />
  );
};
