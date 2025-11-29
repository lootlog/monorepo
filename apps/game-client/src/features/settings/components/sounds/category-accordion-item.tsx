import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FC, ReactNode } from "react";
import { CategoryVolumeControl } from "./category-volume-control";
import { SoundFieldInput } from "./sound-field-input";
import { DEFAULT_SOUND_URLS } from "../../config/default-sounds";
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
  onVolumeChange: (value: number[]) => void;
  onVolumeCommit: (value: number[]) => void;
  onMuteToggle: (e: React.MouseEvent) => void;
  onMuteKeyDown: (e: React.KeyboardEvent) => void;
  onSoundUrlChange: (key: string, value: string) => void;
  onPlaySound: (key: string, soundUrl: string) => void;
  description?: string;
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
  onMuteKeyDown,
  onSoundUrlChange,
  onPlaySound,
  description,
}) => {
  return (
    <AccordionItem value={id}>
      <AccordionTrigger className="ll:gap-3">
        <CategoryVolumeControl
          icon={icon}
          label={label}
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={onVolumeChange}
          onVolumeCommit={onVolumeCommit}
          onMuteToggle={onMuteToggle}
          onMuteKeyDown={onMuteKeyDown}
        />
      </AccordionTrigger>
      <AccordionContent>
        <div className="ll:flex ll:flex-col ll:gap-3 ll:pt-2">
          <p className="ll:text-xs ll:text-muted-foreground">{description}</p>
          {fields.map((field) => {
            const config = categoryConfig[field.key] ?? DEFAULT_NPC_CONFIG;
            const soundUrl = config.soundUrl ?? "";
            const hasError = urlErrors[field.key];

            return (
              <SoundFieldInput
                key={field.key}
                label={field.label}
                soundUrl={soundUrl}
                placeholder={DEFAULT_SOUND_URLS[field.key]}
                error={hasError}
                onSoundUrlChange={(value) => onSoundUrlChange(field.key, value)}
                onPlaySound={() => onPlaySound(field.key, soundUrl)}
              />
            );
          })}
          <p className="ll:text-xs ll:text-muted-foreground ll:mt-1">
            Obsługiwane formaty: mp3, wav, ogg. Zostaw puste, aby użyć
            domyślnego dźwięku.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
