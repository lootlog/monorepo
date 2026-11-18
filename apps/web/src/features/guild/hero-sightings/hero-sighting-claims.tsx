import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { MemberIdentity } from "@/components/common/member-identity";
import {
  DETECTOR_AVATAR_CLASS,
  DETECTOR_NAME_CLASS,
} from "./hero-sighting-detector-highlight";

type HeroSightingClaimsProps = {
  sighting: HeroSightingResponseDto;
  className?: string;
};

/**
 * The members who declared camping the hero, in the order they did; the
 * detector among them stands out as they do beside the sighting.
 */
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
      className={cn("flex min-w-0 flex-wrap gap-1.5", className)}
    >
      {sighting.claims.map((claim) => {
        const isDetector =
          claim.member.memberId === sighting.detectedBy.memberId;

        return (
          <li
            key={claim.member.memberId}
            className="flex h-7 min-w-0 items-center gap-1.5 rounded-full bg-muted/70 pr-2.5 pl-0.5 text-xs"
            title={claim.character?.name}
          >
            <MemberIdentity
              member={{ memberId: claim.member.memberId }}
              fallback={{
                name: claim.member.displayName,
                avatarUrl: claim.member.avatarUrl,
              }}
              avatarClassName={cn(
                "size-6",
                isDetector && DETECTOR_AVATAR_CLASS,
              )}
              nameClassName={cn("text-xs", isDetector && DETECTOR_NAME_CLASS)}
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
