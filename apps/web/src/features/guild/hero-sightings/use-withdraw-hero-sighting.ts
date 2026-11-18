import { useQueryClient } from "@tanstack/react-query";
import { useHeroSightingsControllerWithdrawHeroSighting } from "@lootlog/client/main";
import { toast } from "@lootlog/ui/lib/toast";
import { useTranslation } from "react-i18next";
import {
  heroSightingQueries,
  writeHeroSightingToCache,
} from "./hero-sighting-cache";

/** Takes back a sighting added by hand, such as one with a mistyped hero. */
export const useWithdrawHeroSighting = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useHeroSightingsControllerWithdrawHeroSighting({
    mutation: {
      onSuccess: (sighting, { pathParams }) =>
        writeHeroSightingToCache(queryClient, [pathParams.guildId], sighting),
      onError: (error, { pathParams }) => {
        // A detector confirmed it or it closed meanwhile; show what it is now.
        if (error.status === 409) {
          toast.error(t("heroSightings.withdraw.notWithdrawable"));
          void queryClient.invalidateQueries(
            heroSightingQueries([pathParams.guildId]),
          );

          return;
        }

        toast.error(t("heroSightings.withdraw.error"));
      },
    },
  });
};
