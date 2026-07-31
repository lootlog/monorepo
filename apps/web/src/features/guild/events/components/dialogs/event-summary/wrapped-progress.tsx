import { Button } from "@lootlog/ui/components/button";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";

interface WrappedProgressProps {
  slides: Array<{ id: string }>;
  activeIndex: number;
  progress: number;
  isUserPaused: boolean;
  onSelect: (index: number) => void;
  onTogglePaused: () => void;
}

export const WrappedProgress = ({
  slides,
  activeIndex,
  progress,
  isUserPaused,
  onSelect,
  onTogglePaused,
}: WrappedProgressProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 gap-1.5">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            className="group relative h-5 min-w-3 flex-1 cursor-pointer"
            aria-label={t("events.summaryDialog.progressLabel", {
              current: index + 1,
              total: slides.length,
            })}
            aria-current={index === activeIndex ? "step" : undefined}
            onClick={() => onSelect(index)}
          >
            <span className="absolute inset-x-0 top-2 h-1 overflow-hidden rounded-full bg-border">
              <span
                className={cn(
                  "block h-full origin-left bg-primary",
                  index < activeIndex && "scale-x-100",
                  index > activeIndex && "scale-x-0",
                )}
                style={
                  index === activeIndex
                    ? { transform: `scaleX(${progress})` }
                    : undefined
                }
              />
            </span>
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-lg"
        onClick={onTogglePaused}
        aria-label={
          isUserPaused
            ? t("events.summaryDialog.play")
            : t("events.summaryDialog.pause")
        }
      >
        {isUserPaused ? (
          <Play className="size-4" />
        ) : (
          <Pause className="size-4" />
        )}
      </Button>
    </div>
  );
};
