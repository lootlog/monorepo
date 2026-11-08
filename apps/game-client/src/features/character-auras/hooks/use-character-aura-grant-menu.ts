import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  characterAurasControllerGrantAuras,
  characterAurasControllerRevokeAuras,
  getCharacterAurasControllerGetAurasQueryKey,
} from "@lootlog/client/main";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
import { wrapOtherMenu } from "@/lib/margonem-runtime/adapters/other-menu-runtime-adapter";
import { useGlobalStore } from "@/store/global.store";
import { useOwnCharacterAura } from "./use-own-character-aura";

/**
 * Lets an aura admin grant or revoke auras from another player's menu on
 * the map. The menu changes only for admins; everyone else runs nothing.
 */
export const useCharacterAuraGrantMenu = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: own } = useOwnCharacterAura();
  const canGrant = own?.canGrant ?? false;

  // The menu hook exists once the game has loaded its others.
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );

  useEffect(() => {
    if (!canGrant || !gameInitialized) return;

    const change = async (
      request: typeof characterAurasControllerGrantAuras,
      gameAccountId: string,
      done: string,
    ) => {
      try {
        await request({ gameAccountId });
        showRuntimeMessage(done);
        // A revoked aura leaves the map now instead of on the next refresh.
        await queryClient.invalidateQueries({
          queryKey: getCharacterAurasControllerGetAurasQueryKey(),
        });
      } catch (error) {
        showRuntimeMessage(
          getApiErrorStatus(error) === 404
            ? t("settings.characterAura.grants.noUser")
            : t("settings.characterAura.grants.failed"),
        );
      }
    };

    return (
      wrapOtherMenu(({ accountId }) => [
        [
          t("settings.characterAura.grants.grant"),
          () =>
            void change(
              characterAurasControllerGrantAuras,
              accountId,
              t("settings.characterAura.grants.granted"),
            ),
        ],
        [
          t("settings.characterAura.grants.revoke"),
          () =>
            void change(
              characterAurasControllerRevokeAuras,
              accountId,
              t("settings.characterAura.grants.revoked"),
            ),
        ],
      ]) ?? undefined
    );
  }, [canGrant, gameInitialized, queryClient, t]);
};
