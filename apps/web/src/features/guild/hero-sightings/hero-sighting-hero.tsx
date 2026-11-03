import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { formatLevel } from "@lootlog/domain/profession";
import { upperFirst } from "es-toolkit";
import { useTranslation } from "react-i18next";

type HeroSightingHeroProps = {
  sighting: HeroSightingResponseDto;
  /** Names the world, for boards that span every world. */
  showWorld: boolean;
  /** Lets the tile name itself with `aria-labelledby`. */
  id?: string;
};

export const HeroSightingHero = ({
  sighting,
  showWorld,
  id,
}: HeroSightingHeroProps) => {
  const { t } = useTranslation();

  return (
    <h3 id={id} className="flex min-w-0 items-baseline gap-1.5">
      <span className="min-w-0 truncate text-[15px] leading-5 font-semibold">
        {sighting.hero.name}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatLevel(sighting.hero.lvl, sighting.hero.prof)}
        {showWorld && (
          <>
            <span className="sr-only">{`, ${t("loots.list.worldLabel")} `}</span>
            <span aria-hidden="true"> · </span>
            {upperFirst(sighting.world)}
          </>
        )}
      </span>
    </h3>
  );
};
