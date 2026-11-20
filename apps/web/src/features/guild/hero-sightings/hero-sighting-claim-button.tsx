import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { isHeroSightingClaimable } from "@lootlog/domain/hero-sightings";
import { useTranslation } from "react-i18next";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { canClaimHeroSightings } from "@/lib/hero-sightings-permissions";
import { useHeroSightingClaim } from "./use-hero-sighting-claim";

type HeroSightingClaimButtonProps = {
  sighting: HeroSightingResponseDto;
};

/**
 * "Obstawiam" on a hero that will spawn or, once the member camps the hero,
 * "Wycofaj", which stays after the hero spawned.
 */
export const HeroSightingClaimButton = ({
  sighting,
}: HeroSightingClaimButtonProps) => {
  const { t } = useTranslation();
  const { data: accessPolicy } = useGuildPermissions();

  const { canToggle, isClaimed, isPending, toggle } =
    useHeroSightingClaim(sighting);

  if (
    !canToggle ||
    sighting.closedAt !== null ||
    (!isClaimed && !isHeroSightingClaimable(sighting)) ||
    !canClaimHeroSightings(accessPolicy)
  )
    return null;

  const hero = sighting.hero.name;

  return (
    <Button
      type="button"
      size="sm"
      variant={isClaimed ? "outline" : "secondary"}
      loading={isPending}
      aria-label={t(
        isClaimed
          ? "heroSightings.claim.unclaimLabel"
          : "heroSightings.claim.claimLabel",
        { hero },
      )}
      onClick={toggle}
    >
      {t(
        isClaimed ? "heroSightings.claim.unclaim" : "heroSightings.claim.claim",
      )}
    </Button>
  );
};
