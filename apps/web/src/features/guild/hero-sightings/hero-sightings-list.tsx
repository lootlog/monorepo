import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { MapPin } from "lucide-react";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { MetaItem } from "@/components/common/meta-item";
import { HeroSightingClaimButton } from "./hero-sighting-claim-button";
import { HeroSightingClaims } from "./hero-sighting-claims";
import { HeroSightingHero } from "./hero-sighting-hero";
import { HeroSightingHistoryButton } from "./hero-sighting-history-button";
import { HeroSightingMember } from "./hero-sighting-member";
import { HeroSightingSeen } from "./hero-sighting-seen";
import { getHeroSightingStatus } from "./hero-sighting-status";
import { HeroSightingStatusBadge } from "./hero-sighting-status-badge";

type HeroSightingsListProps = {
  sightings: HeroSightingResponseDto[];
  now: number;
  showWorld: boolean;
  onOpenHistory: (sighting: HeroSightingResponseDto) => void;
};

/** The board as tiles, where a table would not fit beside the sidebar. */
export const HeroSightingsList = ({
  sightings,
  now,
  showWorld,
  onOpenHistory,
}: HeroSightingsListProps) => {
  const { t } = useTranslation();

  return (
    <ul>
      {sightings.map((sighting) => (
        <li
          key={sighting.id}
          data-list-tile
          className={cn(
            "flex flex-col gap-2 py-3",
            LIST_TILE_RULE_CLASS,
            LIST_TILE_INSET_CLASS,
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1">
              <HeroSightingHero sighting={sighting} showWorld={showWorld} />
            </div>
            <HeroSightingStatusBadge
              status={getHeroSightingStatus(sighting, now)}
            />
            <HeroSightingHistoryButton
              sighting={sighting}
              onOpen={onOpenHistory}
            />
          </div>
          <MetaItem
            icon={MapPin}
            label={t("heroSightings.columns.map")}
            className="min-w-0 whitespace-normal text-sm text-foreground"
          >
            <span className="min-w-0 break-words">{sighting.mapName}</span>
          </MetaItem>
          <HeroSightingSeen sighting={sighting} now={now} />
          <HeroSightingMember
            member={sighting.detectedBy}
            character={sighting.detectorCharacter}
            label={t("heroSightings.detectedBy")}
            highlighted
          />
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <HeroSightingClaims sighting={sighting} className="min-w-0" />
            <HeroSightingClaimButton sighting={sighting} />
          </div>
        </li>
      ))}
    </ul>
  );
};
