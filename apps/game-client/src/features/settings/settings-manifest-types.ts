import type {
  SettingsDomainValue,
  SettingsSubsectionValue,
} from "@/constants/settings-tabs";
import type { SettingsCatalogKey } from "@lootlog/domain/settings-documents";

export type SettingsIconName =
  | "settings"
  | "crosshair"
  | "server"
  | "palette"
  | "messageSquare"
  | "clock"
  | "bell"
  | "radar"
  | "bellOff"
  | "swords"
  | "mapPin"
  | "volume2"
  | "keyboard"
  | "activity"
  | "info";

export interface SettingsControlManifestItem<TId extends string = string> {
  id: TId;
  labelKey: string;
  descriptionKey?: string;
  aliases?: string[];
  settingKeys?: SettingsCatalogKey[];
  help?: {
    recommendationKey?: string;
    exampleKey?: string;
    dependencyKey?: string;
  };
}

interface SettingsSubsectionManifestItem<TControlId extends string = string> {
  id: SettingsSubsectionValue;
  labelKey: string;
  controls: readonly SettingsControlManifestItem<TControlId>[];
  visible?: () => boolean;
}

export type NonEmptyList<T> = readonly [T, ...T[]];

export interface SettingsDomainManifestItem<
  TControlId extends string = string,
> {
  id: SettingsDomainValue;
  labelKey: string;
  icon: SettingsIconName;
  subsections: NonEmptyList<SettingsSubsectionManifestItem<TControlId>>;
}
