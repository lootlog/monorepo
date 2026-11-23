import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { HeroSightingMemberDto } from "@lootlog/client/main";
import { TruncatedText } from "@/components/truncated-text";
import type { HeroSightingMemberColors } from "@/features/hero-sightings/hooks/use-hero-sighting-member-colors";

export function HeroSightingDetector({
  member,
  manual,
  memberColors,
  className,
}: {
  member: HeroSightingMemberDto;
  manual: boolean;
  memberColors: HeroSightingMemberColors;
  className?: string;
}) {
  const { t } = useTranslation("heroSightings");
  const color = memberColors.get(member.memberId) ?? "FFF";

  return (
    <span
      className={cn(
        "ll:flex ll:min-w-0 ll:items-baseline ll:gap-1 ll:overflow-hidden ll:font-normal",
        className,
      )}
    >
      <span className="ll:shrink-0 ll:text-muted-foreground">
        {t(manual ? "addedByLabel" : "detectedByLabel")}
      </span>
      <TruncatedText className="ll:font-semibold">
        <span style={{ color: `#${color}` }}>{member.displayName}</span>
      </TruncatedText>
    </span>
  );
}
