import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";

type HeroSightingHistoryButtonProps = {
  sighting: HeroSightingResponseDto;
  onOpen: (sighting: HeroSightingResponseDto) => void;
};

export const HeroSightingHistoryButton = ({
  sighting,
  onOpen,
}: HeroSightingHistoryButtonProps) => {
  const { t } = useTranslation();
  const label = t("heroSightings.history.open", { hero: sighting.hero.name });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={() => onOpen(sighting)}
    >
      <History />
    </Button>
  );
};
