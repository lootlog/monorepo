import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsVolumeControl } from "@/components/settings/settings-volume-row";
import type { SettingsControlId } from "@/features/settings/settings-manifest";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type SoundCategorySectionProps = {
  controlId: SettingsControlId;
  title: string;
  description: string;
  /** Volume in [0, 1]; 0 means muted. */
  volume: number;
  onVolumeChange: (value: number) => void;
  onVolumeCommit: (value: number) => void;
  onMuteToggle: () => void;
  /** Header actions, e.g. a play button for a category with one fixed sound. */
  actions?: ReactNode;
  /** Sound rows shown under the volume row. */
  children?: ReactNode;
};

/**
 * One sound category: its volume row first, then one row per sound. Every
 * category is always expanded so the whole tab reads at a glance.
 */
export const SoundCategorySection: FC<SoundCategorySectionProps> = ({
  controlId,
  title,
  description,
  volume,
  onVolumeChange,
  onVolumeCommit,
  onMuteToggle,
  actions,
  children,
}) => {
  const { t } = useTranslation();

  return (
    <SettingsSection
      controlId={controlId}
      title={title}
      description={description}
      actions={actions}
    >
      <SettingsRow label={t("settings.sounds.categoryVolume")} control="wide">
        <SettingsVolumeControl
          label={title}
          muteLabel={t("common:actions.mute")}
          unmuteLabel={t("common:actions.unmute")}
          volume={volume}
          muted={volume === 0}
          onVolumeChange={onVolumeChange}
          onVolumeCommit={onVolumeCommit}
          onMuteToggle={onMuteToggle}
        />
      </SettingsRow>
      {children}
    </SettingsSection>
  );
};
