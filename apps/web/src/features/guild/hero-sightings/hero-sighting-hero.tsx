import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { formatLevel } from "@lootlog/domain/profession";
import { upperFirst } from "es-toolkit";
import { useTranslation } from "react-i18next";

type HeroSightingHeroProps = {
  sighting: HeroSightingResponseDto;
  /** Names the world, for boards that span every world. */
  showWorld: boolean;
};

export const HeroSightingHero = ({
  sighting,
  showWorld,
}: HeroSightingHeroProps) => {
  const { t } = useTranslation();

  return (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <span className="min-w-0 truncate text-sm font-semibold">
        {sighting.hero.name}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatLevel(sighting.hero.lvl, sighting.hero.prof)}
        {showWorld && (
          <>
            <span className="sr-only">{`, ${t("loots.list.worldLabel")} `}</span>
            <span aria-hidden="true"> · </span>
            {upperFirst(sighting.world)}
          </>
        )}
      </span>
    </span>
  );
};
