import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { MemberAvatar } from "@/components/common/member-avatar";
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
      {sighting.claims.map((claim) => {
        const isDetector =
          claim.member.memberId === sighting.detectedBy.memberId;

        return (
          <li
            key={claim.member.memberId}
            className="flex min-w-0 items-center gap-1.5 text-xs"
            title={claim.character?.name}
          >
            <MemberAvatar
              avatarUrl={claim.member.avatarUrl}
              name={claim.member.displayName}
              className={cn("size-5", isDetector && DETECTOR_AVATAR_CLASS)}
            />
            <span
              className={cn(
                "truncate",
                isDetector ? DETECTOR_NAME_CLASS : "font-medium",
              )}
            >
              {claim.member.displayName}
              {isDetector && (
                <span className="sr-only">{` ${t("heroSightings.detectorClaim")}`}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
