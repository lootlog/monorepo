import { SettingsRow } from "@/features/settings/components/shared/settings-row";
import { SettingsSection } from "@/features/settings/components/shared/settings-section";
import { SettingsTabLayout } from "@/features/settings/components/shared/settings-tab-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AddonStatusSection } from "@/features/settings/components/general/addon-status-section";
import { LocalDataSection } from "@/features/settings/components/general/local-data-section";
import { WindowLayoutSection } from "@/features/settings/components/general/window-layout-section";
import { useAccountEnabledFlag } from "@/lib/settings-persistence/use-account-enabled-flag";
import { useSettingsStore } from "@/store/settings.store";
import {
  ItemRarityEnum,
  type ItemRarityEnum as ItemRarity,
} from "@lootlog/schema/item-rarity";
import { MAP_AURA_MODES } from "@lootlog/schema/character-aura";
import { MOBILE_UI_MODES } from "@lootlog/domain/settings-documents";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

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

  const mapAuras = useSettingsStore((state) => state.mapAuras);
  const setMapAuras = useSettingsStore((state) => state.setMapAuras);
  const mobileUiMode = useSettingsStore((state) => state.mobileUiMode);
  const setMobileUiMode = useSettingsStore((state) => state.setMobileUiMode);
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
          label={t("settings.general.animationEffectsLabel")}
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
          controlId="map-auras"
          label={t("settings.general.mapAurasLabel")}
          description={t("settings.general.mapAurasDescription")}
          control="wide"
        >
          <Select
            value={mapAuras}
            onValueChange={(value) =>
              setMapAuras(
                MAP_AURA_MODES.find((mode) => mode === value) ?? "auto",
              )
            }
          >
            <SelectTrigger
              aria-label={t("settings.general.mapAurasLabel")}
              size="sm"
              className="ll:w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAP_AURA_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {t(`settings.general.mapAurasModes.${mode}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          controlId="mobile-ui-mode"
          label={t("settings.general.mobileUiModeLabel")}
          description={t("settings.general.mobileUiModeDescription")}
          control="wide"
        >
          <Select
            value={mobileUiMode}
            onValueChange={(value) =>
              setMobileUiMode(
                MOBILE_UI_MODES.find((mode) => mode === value) ?? "off",
              )
            }
          >
            <SelectTrigger
              aria-label={t("settings.general.mobileUiModeLabel")}
              size="sm"
              className="ll:w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOBILE_UI_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {t(`settings.general.mobileUiModes.${mode}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
