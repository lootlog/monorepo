import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { HeroSightingAvatar } from "./hero-sighting-avatar";

type HeroSightingClaimsProps = {
  sighting: HeroSightingResponseDto;
  className?: string;
};

/** The members who declared camping the hero, in the order they did. */
export const HeroSightingClaims = ({
  sighting,
  className,
}: HeroSightingClaimsProps) => {
  const { t } = useTranslation();

  if (sighting.claims.length === 0) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {t("heroSightings.noClaims")}
      </span>
    );
  }

  return (
    <ul
      aria-label={t("heroSightings.claims")}
      className={cn("flex min-w-0 flex-wrap gap-x-3 gap-y-1", className)}
    >
      {sighting.claims.map((claim) => (
        <li
          key={claim.member.memberId}
          className="flex min-w-0 items-center gap-1.5 text-xs"
          title={claim.character?.name}
        >
          <HeroSightingAvatar member={claim.member} className="size-5" />
          <span className="truncate font-medium">
            {claim.member.displayName}
          </span>
        </li>
      ))}
    </ul>
  );
};
