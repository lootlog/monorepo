import { createFileRoute } from "@tanstack/react-router";
import { HeroSightings } from "@/features/guild/hero-sightings/hero-sightings";
import { HeroSightingsPageSkeleton } from "@/features/guild/hero-sightings/hero-sightings-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/hero-sightings")(
  {
    component: HeroSightings,
    pendingComponent: HeroSightingsPageSkeleton,
  },
);
