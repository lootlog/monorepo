import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { MemberIdentity } from "@/components/common/member-identity";

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

  // Nobody is expected to camp a roaming hero, so no claims is not news.
  if (sighting.claims.length === 0 && sighting.state === "ROAMING") return null;

  if (sighting.claims.length === 0) {
    return (
      <span
        className={cn(
          "flex h-7 items-center text-xs text-muted-foreground",
          className,
        )}
      >
        {t("heroSightings.noClaims")}
      </span>
    );
  }

  return (
    <ul
      aria-label={t("heroSightings.claims")}
      className={cn(
        "flex min-h-7 min-w-0 flex-wrap items-center gap-x-3 gap-y-1",
        className,
      )}
    >
      {sighting.claims.map((claim) => {
        const isDetector =
          claim.member.memberId === sighting.detectedBy.memberId;

        return (
          <li
            key={claim.member.memberId}
            className="flex min-w-0"
            title={claim.character?.name}
          >
            <MemberIdentity
              member={{ memberId: claim.member.memberId }}
              fallback={{
                name: claim.member.displayName,
                avatarUrl: claim.member.avatarUrl,
              }}
              display="name"
            />
            {isDetector && (
              <span className="sr-only">
                {t("heroSightings.detectorClaim")}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};
