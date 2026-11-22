import { SettingsRow } from "@/features/settings/components/shared/settings-row";
import { SettingsSection } from "@/features/settings/components/shared/settings-section";
import { SettingsVolumeControl } from "@/features/settings/components/shared/settings-volume-row";
import type { SettingsControlId } from "@/features/settings/settings-manifest";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type SoundCategorySectionProps = {
  controlId: SettingsControlId;
  title: string;
  description: string;
  volume: number;
  onVolumeCommit: (value: number) => void;
  onMuteToggle: () => void;
  actions?: ReactNode;
  children?: ReactNode;
};

export const SoundCategorySection: FC<SoundCategorySectionProps> = ({
  controlId,
  title,
  description,
  volume,
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
          onVolumeCommit={onVolumeCommit}
          onMuteToggle={onMuteToggle}
        />
      </SettingsRow>
      {children}
    </SettingsSection>
  );
};
