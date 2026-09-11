import { SettingsCategoryAccordionItem } from "@/components/settings/settings-category-accordion";
import { SettingsVolumeControl } from "@/components/settings/settings-volume-row";
import type { FC, MouseEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SoundFieldInput } from "./sound-field-input";
import { getDefaultSoundUrl } from "../../config/default-sounds";
import type { SoundCategory } from "./types";

interface CategoryAccordionItemProps {
  id: SoundCategory;
  label: string;
  icon: ReactNode;
  volume: number;
  isMuted: boolean;
  fields: ReadonlyArray<{ label: string; key: string }>;
  categoryConfig: Record<string, { volume: number; soundUrl: string }>;
  urlErrors: Record<string, string>;
  onVolumeChange: (value: number) => void;
  onVolumeCommit: (value: number) => void;
  onMuteToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  onSoundUrlChange: (key: string, value: string) => void;
  onPlaySound: (key: string, soundUrl: string) => void;
}

const DEFAULT_NPC_CONFIG = { volume: 0.5, soundUrl: "" };

export const CategoryAccordionItem: FC<CategoryAccordionItemProps> = ({
  id,
  label,
  icon,
  volume,
  isMuted,
  fields,
  categoryConfig,
  urlErrors,
  onVolumeChange,
  onVolumeCommit,
  onMuteToggle,
  onSoundUrlChange,
  onPlaySound,
}) => {
  const { t } = useTranslation();

  return (
    <SettingsCategoryAccordionItem
      id={id}
      title={
        <span className="ll:inline-flex ll:items-center ll:gap-1.5">
          {icon}
          {label}
        </span>
      }
      triggerLabel={label}
      headerControls={
        <div className="ll:w-48">
          <SettingsVolumeControl
            label={label}
            muteLabel={t("common:actions.mute")}
            unmuteLabel={t("common:actions.unmute")}
            volume={volume}
            muted={isMuted}
            onVolumeChange={onVolumeChange}
            onVolumeCommit={onVolumeCommit}
            onMuteToggle={onMuteToggle}
          />
        </div>
      }
    >
      {fields.map((field) => {
        const config = categoryConfig[field.key] ?? DEFAULT_NPC_CONFIG;
        const soundUrl = config.soundUrl ?? "";

        return (
          <SoundFieldInput
            key={field.key}
            fieldKey={field.key}
            label={field.label}
            soundUrl={soundUrl}
            placeholder={getDefaultSoundUrl(field.key)}
            error={urlErrors[field.key]}
            onSoundUrlChange={(value) => onSoundUrlChange(field.key, value)}
            onPlaySound={() => onPlaySound(field.key, soundUrl)}
          />
        );
      })}
    </SettingsCategoryAccordionItem>
  );
};
