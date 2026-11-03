import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";
import { HeroSightingClaimButton } from "./hero-sighting-claim-button";
import { HeroSightingClaims } from "./hero-sighting-claims";
import { HeroSightingMember } from "./hero-sighting-member";
import { getHeroSightingStatus } from "./hero-sighting-status";
import { HeroSightingStatusIcon } from "./hero-sighting-status-icon";
import { HeroSightingStatusLabel } from "./hero-sighting-status-label";

type HeroSightingHistoryEntryProps = {
  sighting: HeroSightingResponseDto;
  now: number;
};

const FACT_LABEL_CLASS = "text-xs text-muted-foreground";

/**
 * One sighting on a hero's timeline: where, when, who found it, who camps it.
 * Its `li` is a `group`, so the line joining the entries starts at the first
 * and ends at the last.
 */
export const HeroSightingHistoryEntry = ({
  sighting,
  now,
}: HeroSightingHistoryEntryProps) => {
  const { t } = useTranslation();
  const status = getHeroSightingStatus(sighting, now);

  const lastSeenByOther =
    sighting.lastSeenBy.memberId !== sighting.detectedBy.memberId;

  const times = [
    { label: t("heroSightings.history.detectedAt"), at: sighting.firstSeenAt },
    { label: t("heroSightings.history.lastSeenAt"), at: sighting.lastSeenAt },
    { label: t("heroSightings.history.spawnedAt"), at: sighting.spawnedAt },
    { label: t("heroSightings.history.closedAt"), at: sighting.closedAt },
  ].filter((time): time is { label: string; at: string } => time.at !== null);

  return (
    <article className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 px-4 py-4 sm:px-5">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-[calc(1rem+1rem-0.5px)] w-px bg-border group-first:top-8 group-last:bottom-[calc(100%-2rem)] group-only:hidden sm:left-[calc(1.25rem+1rem-0.5px)]"
      />
      <HeroSightingStatusIcon
        status={status}
        className="relative size-8 rounded-full ring-4 ring-background"
      />
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="text-sm leading-5 font-semibold break-words">
              {sighting.mapName}
            </h3>
            <HeroSightingStatusLabel status={status} className="text-xs" />
          </div>
          <HeroSightingClaimButton sighting={sighting} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {times.map((time) => (
            <div key={time.label} className="min-w-0">
              <dt className={FACT_LABEL_CLASS}>{time.label}</dt>
              <dd className="text-xs font-medium tabular-nums">
                {timestampToDate(time.at, DATE_TIME_WITH_SECONDS_FORMAT)}
              </dd>
            </div>
          ))}
        </dl>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className={`${FACT_LABEL_CLASS} mb-1.5`}>
              {t("heroSightings.detectedBy")}
            </dt>
            <dd>
              <HeroSightingMember
                member={sighting.detectedBy}
                character={sighting.detectorCharacter}
                highlighted
              />
            </dd>
          </div>
          {lastSeenByOther && (
            <div className="min-w-0">
              <dt className={`${FACT_LABEL_CLASS} mb-1.5`}>
                {t("heroSightings.history.lastSeenBy")}
              </dt>
              <dd>
                <HeroSightingMember member={sighting.lastSeenBy} />
              </dd>
            </div>
          )}
          <div className="min-w-0 sm:col-span-2">
            <dt className={`${FACT_LABEL_CLASS} mb-1.5`}>
              {t("heroSightings.claims")}
            </dt>
            <dd>
              <HeroSightingClaims sighting={sighting} />
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
};
