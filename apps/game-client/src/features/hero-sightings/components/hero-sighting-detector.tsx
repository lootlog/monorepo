import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { HeroSightingMemberDto } from "@lootlog/client/main";
import { MemberAvatar } from "@/components/member-avatar";
import { heroSightingDetectorClassName } from "@/features/hero-sightings/hero-sighting-detector-style";

/** Who detected the hero, highlighted like the detector among claimers. */
export function HeroSightingDetector({
  member,
}: {
  member: HeroSightingMemberDto;
}) {
  const { t } = useTranslation("heroSightings");

  return (
    <span
      className={cn(
        heroSightingDetectorClassName,
        "ll:flex ll:min-w-0 ll:shrink-0 ll:items-center ll:gap-1",
      )}
    >
      <MemberAvatar name={member.displayName} avatarUrl={member.avatarUrl} />
      <span className="ll:sr-only">
        {t("detectedBy", { name: member.displayName })}
      </span>
      <span aria-hidden="true" className="ll:max-w-24 ll:truncate">
        {member.displayName}
      </span>
    </span>
  );
}
