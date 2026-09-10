import { HeroTimerCountdownContent } from "./hero-timer-countdown-content";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import type { EventTimer } from "../../types/api";

interface HeroTimerCountdownProps {
  timer: EventTimer | undefined;
}

export const HeroTimerCountdown = ({ timer }: HeroTimerCountdownProps) => {
  const { t } = useTranslation();
  if (!timer) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {t("events.heroes.noTimer")}
      </span>
    );
  }

  return (
    <HeroTimerCountdownContent
      key={`${timer.minSpawnTime}:${timer.maxSpawnTime}`}
      timer={timer}
    />
  );
};
