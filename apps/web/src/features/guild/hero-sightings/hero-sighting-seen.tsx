import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { RelativeTime } from "@/components/common/relative-time";

type HeroSightingSeenProps = {
  sighting: HeroSightingResponseDto;
  now: number;
};

/**
 * When the sighting was last confirmed, by whom when that was not the
 * detector, and when it was first detected.
 */
export const HeroSightingSeen = ({ sighting, now }: HeroSightingSeenProps) => {
  const { t } = useTranslation();

  const lastSeenByOther =
    sighting.lastSeenBy.memberId !== sighting.detectedBy.memberId;

  return (
    <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
      <span className="flex min-w-0 items-baseline gap-1 text-xs">
        <span className="sr-only">{t("heroSightings.lastSeenAt")}</span>
        <RelativeTime
          at={sighting.lastSeenAt}
          now={now}
          className="font-medium text-foreground"
        />
        {lastSeenByOther && (
          <span
            className="min-w-0 truncate text-muted-foreground"
            title={t("heroSightings.lastSeenBy")}
          >
            <span className="sr-only">{`${t("heroSightings.lastSeenBy")}: `}</span>
            <span aria-hidden="true">· </span>
            {sighting.lastSeenBy.displayName}
          </span>
        )}
      </span>
      <span className="flex min-w-0 items-baseline gap-1 text-[11px] text-muted-foreground">
        {t("heroSightings.firstSeenAt")}
        <RelativeTime
          at={sighting.firstSeenAt}
          now={now}
          className="text-[11px]"
        />
      </span>
    </span>
  );
};
