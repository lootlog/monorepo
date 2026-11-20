import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  claimHeroSighting,
  unclaimHeroSighting,
  withdrawHeroSighting,
} from "@/api/hero-sightings.api";
import { upsertHeroSightings } from "@/hooks/api/hero-sightings-cache";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";

type HeroSightingAction = "claim" | "unclaim" | "withdraw";

type HeroSightingChange = {
  readonly action: HeroSightingAction;
  readonly sightings: readonly HeroSightingResponseDto[];
};

const FAILURE_MESSAGE_KEYS = {
  claim: "messages.claimFailed",
  unclaim: "messages.unclaimFailed",
  withdraw: "messages.withdrawFailed",
} as const satisfies Record<HeroSightingAction, string>;

const applyAction = (
  action: HeroSightingAction,
  sighting: HeroSightingResponseDto,
): Promise<HeroSightingResponseDto> => {
  const ref = { guildId: sighting.guildId, sightingId: String(sighting.id) };

  if (action === "claim") return claimHeroSighting(ref, sighting.world);

  return action === "unclaim"
    ? unclaimHeroSighting(ref)
    : withdrawHeroSighting(ref);
};

/**
 * Claims, withdraws the player's claim on, or removes each Organization's
 * sighting of one hero. Organizations that accept keep their change when
 * another fails.
 */
export const useHeroSightingActions = () => {
  const { t } = useTranslation("heroSightings");
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async ({ action, sightings }: HeroSightingChange) => {
      const results = await Promise.allSettled(
        sightings.map((sighting) => applyAction(action, sighting)),
      );

      upsertHeroSightings(
        queryClient,
        results.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        ),
      );

      if (results.some((result) => result.status === "rejected"))
        throw new Error(`A hero sighting ${action} failed`);
    },
    onError: (_error, { action }) => {
      showRuntimeMessage(t(FAILURE_MESSAGE_KEYS[action]));
    },
  });

  return {
    isPending,
    claim: (sightings: readonly HeroSightingResponseDto[]) =>
      mutate({ action: "claim", sightings }),
    unclaim: (sightings: readonly HeroSightingResponseDto[]) =>
      mutate({ action: "unclaim", sightings }),
    /** Removes sightings the player entered by hand. */
    withdraw: (sightings: readonly HeroSightingResponseDto[]) =>
      mutate({ action: "withdraw", sightings }),
  };
};
