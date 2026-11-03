import type { HeroSightingResponseDto } from "@lootlog/client/main";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import type { coreTableFeatures } from "@/lib/tanstack-table-features";
import { HeroSightingClaimButton } from "./hero-sighting-claim-button";
import { HeroSightingClaims } from "./hero-sighting-claims";
import { HeroSightingHero } from "./hero-sighting-hero";
import { HeroSightingHistoryButton } from "./hero-sighting-history-button";
import { HeroSightingMember } from "./hero-sighting-member";
import { HeroSightingSeen } from "./hero-sighting-seen";
import { getHeroSightingStatus } from "./hero-sighting-status";
import { HeroSightingStatusBadge } from "./hero-sighting-status-badge";

export const HERO_SIGHTINGS_ACTIONS_COLUMN_ID = "actions";

type UseHeroSightingsTableColumnsOptions = {
  now: number;
  showWorld: boolean;
  onOpenHistory: (sighting: HeroSightingResponseDto) => void;
};

export const useHeroSightingsTableColumns = ({
  now,
  showWorld,
  onOpenHistory,
}: UseHeroSightingsTableColumnsOptions): ColumnDef<
  typeof coreTableFeatures,
  HeroSightingResponseDto
>[] => {
  const { t } = useTranslation();

  return [
    {
      id: "hero",
      header: () => t("heroSightings.columns.hero"),
      cell: ({ row }) => (
        <HeroSightingHero sighting={row.original} showWorld={showWorld} />
      ),
    },
    {
      id: "status",
      header: () => t("heroSightings.columns.status"),
      cell: ({ row }) => (
        <span className="flex flex-col items-start gap-1">
          <HeroSightingStatusBadge
            status={getHeroSightingStatus(row.original, now)}
          />
          <HeroSightingSeen sighting={row.original} now={now} />
        </span>
      ),
    },
    {
      id: "map",
      header: () => t("heroSightings.columns.map"),
      cell: ({ row }) => (
        <span className="line-clamp-2 text-sm break-words">
          {row.original.mapName}
        </span>
      ),
    },
    {
      id: "detectedBy",
      header: () => t("heroSightings.detectedBy"),
      cell: ({ row }) => (
        <HeroSightingMember
          member={row.original.detectedBy}
          character={row.original.detectorCharacter}
          highlighted
        />
      ),
    },
    {
      id: "claims",
      header: () => t("heroSightings.claims"),
      cell: ({ row }) => (
        <span className="flex min-w-0 flex-col items-start gap-1.5">
          <HeroSightingClaims sighting={row.original} />
          <HeroSightingClaimButton sighting={row.original} />
        </span>
      ),
    },
    {
      id: HERO_SIGHTINGS_ACTIONS_COLUMN_ID,
      header: () => (
        <span className="sr-only">{t("heroSightings.columns.actions")}</span>
      ),
      cell: ({ row }) => (
        <HeroSightingHistoryButton
          sighting={row.original}
          onOpen={onOpenHistory}
        />
      ),
    },
  ];
};
