import { cn } from "cn";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { heroSightingDetectorClassName } from "@/features/hero-sightings/hero-sighting-detector-style";
import type { HeroSightingClaimer } from "@/features/hero-sightings/hero-sighting-rows";

/** Who claims the hero, the claimer who also detected it highlighted. */
export function HeroSightingClaimers({
  claims,
}: {
  claims: readonly HeroSightingClaimer[];
}) {
  const { t } = useTranslation("heroSightings");

  if (claims.length === 0) {
    return (
      <span className="ll:min-w-0 ll:truncate ll:text-muted-foreground">
        {t("claims.none")}
      </span>
    );
  }

  return (
    <>
      <span className="ll:shrink-0 ll:text-muted-foreground">
        {t("claims.label")}
      </span>
      <span className="ll:min-w-0 ll:truncate ll:text-white">
        {claims.map((claim, index) => (
          <Fragment key={`${claim.member.memberId}:${claim.createdAt}`}>
            {index > 0 ? ", " : null}
            <span
              className={cn(claim.isDetector && heroSightingDetectorClassName)}
            >
              {claim.member.displayName}
              {claim.isDetector ? (
                <span className="ll:sr-only"> {t("claims.detector")}</span>
              ) : null}
            </span>
          </Fragment>
        ))}
      </span>
    </>
  );
}
