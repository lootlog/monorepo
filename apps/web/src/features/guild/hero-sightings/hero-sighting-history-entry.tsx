import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DetailField } from "@/components/common/detail-field";
import { MetaItem } from "@/components/common/meta-item";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";
import { HeroSightingClaimButton } from "./hero-sighting-claim-button";
import { HeroSightingClaims } from "./hero-sighting-claims";
import { HeroSightingMember } from "./hero-sighting-member";
import { getHeroSightingStatus } from "./hero-sighting-status";
import { HeroSightingStatusBadge } from "./hero-sighting-status-badge";

type HeroSightingHistoryEntryProps = {
  sighting: HeroSightingResponseDto;
  now: number;
};

const formatTime = (timestamp: string) =>
  timestampToDate(timestamp, DATE_TIME_WITH_SECONDS_FORMAT);

/** One sighting of a hero's history: where, when, who found it, who camps it. */
export const HeroSightingHistoryEntry = ({
  sighting,
  now,
}: HeroSightingHistoryEntryProps) => {
  const { t } = useTranslation();

  const lastSeenByOther =
    sighting.lastSeenBy.memberId !== sighting.detectedBy.memberId;

  return (
    <article className="flex flex-col gap-2 border-b border-border px-3 py-4 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <HeroSightingStatusBadge
          status={getHeroSightingStatus(sighting, now)}
        />
        <MetaItem
          icon={MapPin}
          label={t("heroSightings.columns.map")}
          className="min-w-0 whitespace-normal text-sm text-foreground"
        >
          <span className="min-w-0 break-words">{sighting.mapName}</span>
        </MetaItem>
        <div className="ml-auto">
          <HeroSightingClaimButton sighting={sighting} />
        </div>
      </div>
      <dl className="flex flex-col">
        <DetailField label={t("heroSightings.history.detectedAt")}>
          {formatTime(sighting.firstSeenAt)}
        </DetailField>
        <DetailField label={t("heroSightings.history.lastSeenAt")}>
          {formatTime(sighting.lastSeenAt)}
        </DetailField>
        {sighting.spawnedAt && (
          <DetailField label={t("heroSightings.history.spawnedAt")}>
            {formatTime(sighting.spawnedAt)}
          </DetailField>
        )}
        {sighting.closedAt && (
          <DetailField label={t("heroSightings.history.closedAt")}>
            {formatTime(sighting.closedAt)}
          </DetailField>
        )}
      </dl>
      <div className="flex flex-col gap-2">
        <HeroSightingMember
          member={sighting.detectedBy}
          character={sighting.detectorCharacter}
          label={t("heroSightings.detectedBy")}
          highlighted
        />
        {lastSeenByOther && (
          <HeroSightingMember
            member={sighting.lastSeenBy}
            label={t("heroSightings.lastSeenBy")}
          />
        )}
        <HeroSightingClaims sighting={sighting} />
      </div>
    </article>
  );
};
