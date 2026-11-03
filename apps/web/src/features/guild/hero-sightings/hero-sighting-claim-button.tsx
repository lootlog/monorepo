import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { Flag, FlagOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { canClaimHeroSightings } from "./hero-sightings-permissions";
import { useHeroSightingClaim } from "./use-hero-sighting-claim";

type HeroSightingClaimButtonProps = {
  sighting: HeroSightingResponseDto;
};

/** "Obstawiam" or, once the member camps the hero, "Wycofaj". */
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
      icon={isClaimed ? <FlagOff /> : <Flag />}
      aria-label={t(
        isClaimed
          ? "heroSightings.claim.unclaimLabel"
          : "heroSightings.claim.claimLabel",
        { hero },
      )}
      onClick={toggle}
    >
      {/* Phones keep the icon, so the hero's name keeps the row. */}
      <span className="max-sm:sr-only">
        {t(
          isClaimed
            ? "heroSightings.claim.unclaim"
            : "heroSightings.claim.claim",
        )}
      </span>
    </Button>
  );
};
