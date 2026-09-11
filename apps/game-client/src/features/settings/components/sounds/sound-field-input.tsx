import { NpcTypeChip } from "@/components/settings/npc-type-chip";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsRow } from "@/components/settings/settings-row";
import { Input } from "@/components/ui/input";
import { Play } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

interface SoundFieldInputProps {
  /** Sound config key; NPC type keys get a coloured chip label. */
  fieldKey: string;
  label: string;
  soundUrl: string;
  placeholder?: string;
  error?: string;
  onSoundUrlChange: (value: string) => void;
  onPlaySound: () => void;
}

const NON_NPC_FIELD_KEYS = new Set(["message"]);

export const SoundFieldInput: FC<SoundFieldInputProps> = ({
  fieldKey,
  label,
  soundUrl,
  placeholder,
  error,
  onSoundUrlChange,
  onPlaySound,
}) => {
  const { t } = useTranslation();
  const inputId = `sound-url-${fieldKey}`;

  return (
    <SettingsRow
      htmlFor={inputId}
      label={
        NON_NPC_FIELD_KEYS.has(fieldKey) ? (
          label
        ) : (
          <NpcTypeChip npcType={fieldKey}>{label}</NpcTypeChip>
        )
      }
      description={
        error ? <span className="ll:text-red-400">{error}</span> : undefined
      }
      controlClassName="ll:w-64 ll:gap-1"
    >
      <Input
        id={inputId}
        type="url"
        placeholder={placeholder}
        defaultValue={soundUrl}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onSoundUrlChange(event.target.value)}
        className={
          error ? "ll:border-red-500 ll:focus-visible:ring-red-500" : undefined
        }
      />
      <SettingsIconButton
        label={t("common:actions.playSound")}
        onClick={onPlaySound}
      >
        <Play aria-hidden />
      </SettingsIconButton>
    </SettingsRow>
  );
};
