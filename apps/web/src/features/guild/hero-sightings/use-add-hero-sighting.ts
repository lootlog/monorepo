import { useQueryClient } from "@tanstack/react-query";
import { useHeroSightingsControllerAddHeroSighting } from "@lootlog/client/main";
import { getApiErrorStringField } from "@lootlog/client/transport";
import { toast } from "@lootlog/ui/lib/toast";
import { useTranslation } from "react-i18next";
import { writeHeroSightingToCache } from "./hero-sighting-cache";

/**
 * Adds a hero sighting by hand, for a detector answer Lootlog did not record.
 * The board shows it at once; other members get it over the socket.
 */
export const useAddHeroSighting = (onAdded: () => void) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useHeroSightingsControllerAddHeroSighting({
    mutation: {
      onSuccess: (sighting, { pathParams }) => {
        writeHeroSightingToCache(queryClient, [pathParams.guildId], sighting);
        toast.success(
          t("heroSightings.add.success", { hero: sighting.hero.name }),
        );
        onAdded();
      },
      onError: (error) =>
        toast.error(
          t(
            getApiErrorStringField(error, "code") ===
              "HERO_SIGHTING_LEVEL_NOT_VISIBLE"
              ? "heroSightings.add.levelNotVisible"
              : "heroSightings.add.error",
          ),
        ),
    },
  });
};
