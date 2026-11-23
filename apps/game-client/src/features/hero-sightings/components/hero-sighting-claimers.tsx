import { cn } from "cn";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import type { HeroSightingMemberColors } from "@/features/hero-sightings/hooks/use-hero-sighting-member-colors";

type HeroSightingClaim = HeroSightingResponseDto["claims"][number];

export function HeroSightingClaimers({
  claims,
  memberColors,
  className,
}: {
  claims: readonly HeroSightingClaim[];
  memberColors: HeroSightingMemberColors;
  className?: string;
}) {
  const { t } = useTranslation("heroSightings");

  if (claims.length === 0) {
    return (
      <span
        className={cn(
          "ll:min-w-0 ll:truncate ll:font-normal ll:text-muted-foreground",
          className,
        )}
      >
        {t("claims.none")}
      </span>
    );
  }

  return (
    <span className={cn("ll:min-w-0 ll:break-words ll:font-normal", className)}>
      <span className="ll:text-muted-foreground">
        {t("claims.label", { count: claims.length })}{" "}
      </span>
      {claims.map((claim, index) => {
        const color = memberColors.get(claim.member.memberId) ?? "FFF";

        return (
          <Fragment key={`${claim.member.memberId}:${claim.createdAt}`}>
            {index > 0 ? (
              <span className="ll:text-muted-foreground">, </span>
            ) : null}
            <span className="ll:font-semibold" style={{ color: `#${color}` }}>
              {claim.member.displayName}
            </span>
          </Fragment>
        );
      })}
    </span>
  );
}
