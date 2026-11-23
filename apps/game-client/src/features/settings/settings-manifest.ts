import type {
  SettingsDomainValue,
  SettingsSubsectionValue,
} from "@/constants/settings-tabs";
import { FEATURE_SETTINGS_DOMAINS } from "./settings-manifest-feature-domains";
import { CORE_SETTINGS_DOMAINS } from "./settings-manifest-core-domains";
import type {
  NonEmptyList,
  SettingsControlManifestItem,
  SettingsDomainManifestItem,
} from "./settings-manifest-types";

const MANIFEST = [
  ...CORE_SETTINGS_DOMAINS,
  ...FEATURE_SETTINGS_DOMAINS,
] as const;

export type SettingsControlId =
  (typeof MANIFEST)[number]["subsections"][number]["controls"][number]["id"];

export const SETTINGS_MANIFEST: NonEmptyList<
  SettingsDomainManifestItem<SettingsControlId>
> = MANIFEST;

interface SettingsControlLocation {
  domain: SettingsDomainValue;
  subsection: SettingsSubsectionValue;
  control: SettingsControlManifestItem<SettingsControlId>;
}

const controlLocations = new Map<string, SettingsControlLocation>();

for (const domain of SETTINGS_MANIFEST) {
  for (const subsection of domain.subsections) {
    for (const control of subsection.controls) {
      controlLocations.set(control.id, {
        domain: domain.id,
        subsection: subsection.id,
        control,
      });
    }
  }
}

export const getControlLocation = (controlId: string) =>
  controlLocations.get(controlId);

export const getControlSettingKeys = (controlId: string) =>
  controlLocations.get(controlId)?.control.settingKeys;

const withVisibleSubsections = ({
  subsections: [first, ...rest],
  ...domain
}: SettingsDomainManifestItem<SettingsControlId>): SettingsDomainManifestItem<SettingsControlId> => ({
  ...domain,
  subsections: [
    first,
    ...rest.filter((subsection) => subsection.visible?.() ?? true),
  ],
});

export const getVisibleSettingsManifest = (): NonEmptyList<
  SettingsDomainManifestItem<SettingsControlId>
> => {
  const [first, ...rest] = SETTINGS_MANIFEST;

  return [withVisibleSubsections(first), ...rest.map(withVisibleSubsections)];
};
