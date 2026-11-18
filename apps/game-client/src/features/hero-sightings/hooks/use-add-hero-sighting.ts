import type { AddHeroSightingDto } from "@lootlog/client/main";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addHeroSighting } from "@/api/hero-sightings.api";
import { upsertHeroSightings } from "@/features/hero-sightings/hero-sightings-cache";
import { useHeroSightingsStore } from "@/store/hero-sightings.store";

type AddHeroSightingInput = {
  readonly guildIds: readonly string[];
  readonly sighting: Omit<AddHeroSightingDto, "actorCharacter">;
};

/**
 * Adds a hero entered by hand to each Organization. The request settles per
 * Organization: those that accept keep their sighting and offer it for
 * claiming, and each rejection is returned instead of failing the mutation.
 */
export const useAddHeroSighting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ guildIds, sighting }: AddHeroSightingInput) => {
      const results = await Promise.allSettled(
        guildIds.map((guildId) => addHeroSighting(guildId, sighting)),
      );

      const sightings = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );

      const failures = results.flatMap((result): unknown[] =>
        result.status === "rejected" ? [result.reason] : [],
      );

      upsertHeroSightings(queryClient, sightings);

      if (sightings.length > 0)
        useHeroSightingsStore.getState().showOwnDetection({ sightings });

      return { sightings, failures };
    },
  });
};
