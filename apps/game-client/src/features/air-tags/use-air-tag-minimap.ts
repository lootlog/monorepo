import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCurrentGameAccountPreferences } from "@/lib/settings-persistence/use-game-account-preferences";
import { useGameStore } from "@/store/game.store";
import { airTagMinimapController } from "./air-tag-minimap-controller";

export const useAirTagMinimap = (): void => {
  const { t } = useTranslation("settings");
  const { data: preferences } = useCurrentGameAccountPreferences();

  const isNewInterface = useGameStore(
    (state) => state.game?.interface === "ni",
  );

  const enabled = isNewInterface && preferences?.airTags.minimap === true;

  useEffect(() => {
    airTagMinimapController.setEnabled(enabled, {
      seen: (seconds) => t("airTags.minimapSeen", { seconds }),
    });
  }, [enabled, t]);

  useEffect(
    () => () => airTagMinimapController.setEnabled(false, { seen: String }),
    [],
  );
};
