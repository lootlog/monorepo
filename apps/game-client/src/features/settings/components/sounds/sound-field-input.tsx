import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Play } from "lucide-react";
import type { FC } from "react";

interface SoundFieldInputProps {
  label: string;
  soundUrl: string;
  placeholder: string;
  error?: string;
  onSoundUrlChange: (value: string) => void;
  onPlaySound: () => void;
}

export const SoundFieldInput: FC<SoundFieldInputProps> = ({
  label,
  soundUrl,
  placeholder,
  error,
  onSoundUrlChange,
  onPlaySound,
}) => {
  return (
    <div className="ll:flex ll:flex-col ll:gap-1">
      <div className="ll:flex ll:items-center ll:gap-3">
        <Label className="ll:w-24 ll:shrink-0 ll:text-xs">{label}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={onPlaySound}
              className="ll:p-1 ll:size-6 ll:shrink-0"
            >
              <Play className="ll:size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Odtwórz dźwięk</TooltipContent>
        </Tooltip>
        <div className="ll:flex-1 ll:flex ll:flex-col ll:gap-1">
          <Input
            type="url"
            placeholder={placeholder}
            defaultValue={soundUrl}
            onChange={(e) => onSoundUrlChange(e.target.value)}
            className={`ll:text-xs ${error ? "ll:border-red-500 ll:focus-visible:ring-red-500" : ""}`}
          />
          {error && <span className="ll:text-xs ll:text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  );
};
