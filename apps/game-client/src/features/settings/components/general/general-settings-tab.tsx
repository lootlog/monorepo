import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AddonStatusSection } from "@/features/settings/components/general/addon-status-section";
import { LocalDataSection } from "@/features/settings/components/general/local-data-section";
import { WindowLayoutSection } from "@/features/settings/components/general/window-layout-section";
import { useAccountEnabledFlag } from "@/features/settings/persistence/use-account-enabled-flag";
import { SettingsHelpPopover } from "@/features/settings/components/shared/settings-help-popover";
import { useSettingsStore } from "@/store/settings.store";
import {
  ItemRarityEnum,
  type ItemRarityEnum as ItemRarity,
} from "@lootlog/schema/item-rarity";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/**
 * Rarities monsters drop, in the order the game ranks them; upgraded items
 * come only from upgrading.
 */
const LOOT_SPLIT_RARITIES = [
  ItemRarityEnum.UNIQUE,
  ItemRarityEnum.HEROIC,
  ItemRarityEnum.LEGENDARY,
] as const satisfies readonly ItemRarity[];

export const GeneralSettingsTab: FC = () => {
  const allowWorldSelection = useSettingsStore(
    (state) => state.allowWorldSelection,
  );

  const toggleAllowWorldSelection = useSettingsStore(
    (state) => state.toggleAllowWorldSelection,
  );

  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  const toggleAnimationEffects = useSettingsStore(
    (state) => state.toggleAnimationEffects,
  );

  const lootSplit = useAccountEnabledFlag("lootSplit");
  const { t } = useTranslation();

  return (
    <SettingsTabLayout>
      <AddonStatusSection />
      <SettingsSection title={t("settings.general.behaviorTitle")}>
        <SettingsRow
          controlId="allow-world-selection"
          htmlFor="allow-world-selection"
          label={t("settings.general.allowWorldSelectionLabel")}
          description={t("settings.general.allowWorldSelectionDescription")}
        >
          <Switch
            checked={allowWorldSelection}
            onCheckedChange={() => {
              toggleAllowWorldSelection();
            }}
            id="allow-world-selection"
          />
        </SettingsRow>
        <SettingsRow
          controlId="animation-effects"
          htmlFor="animation-effects"
          label={
            <span className="ll:inline-flex ll:items-center">
              {t("settings.general.animationEffectsLabel")}
              <SettingsHelpPopover
                recommendation={t("settings.help.animationsRecommendation")}
              />
            </span>
          }
          description={t("settings.general.animationEffectsDescription")}
        >
          <Switch
            checked={animationEffectsEnabled}
            onCheckedChange={() => {
              toggleAnimationEffects();
            }}
            id="animation-effects"
          />
        </SettingsRow>
        <SettingsRow
          controlId="loot-split-window"
          htmlFor="loot-split-window"
          label={t("lootSplit.settings.windowLabel")}
          description={t("lootSplit.settings.windowDescription")}
        >
          <Switch
            checked={lootSplit.data?.enabled ?? false}
            disabled={!lootSplit.data}
            onCheckedChange={lootSplit.setEnabled}
            id="loot-split-window"
          />
        </SettingsRow>
        <SettingsRow
          controlId="loot-split-rarities"
          label={t("lootSplit.settings.raritiesLabel")}
          description={t("lootSplit.settings.raritiesDescription")}
          disabled={!lootSplit.data?.enabled}
          layout="stacked"
        >
          <ToggleGroup
            multiple
            variant="outline"
            size="sm"
            spacing={0}
            aria-label={t("lootSplit.settings.raritiesLabel")}
            disabled={!lootSplit.data?.enabled}
            value={lootSplit.data?.rarities ?? []}
            onValueChange={(rarities: ItemRarity[]) =>
              lootSplit.update({ rarities })
            }
          >
            {LOOT_SPLIT_RARITIES.map((rarity) => (
              <ToggleGroupItem key={rarity} value={rarity}>
                {t(`lootSplit.settings.rarity.${rarity}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </SettingsRow>
      </SettingsSection>
      <WindowLayoutSection />
      <LocalDataSection />
    </SettingsTabLayout>
  );
};
