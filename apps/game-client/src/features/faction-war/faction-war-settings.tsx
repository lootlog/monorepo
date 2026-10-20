import {
  useFactionWarsControllerUpdatePick,
  type FactionWarResponseDto,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { useHideOtherChampions } from "./faction-war-preferences";
import {
  CURRENT_FACTION_WAR_QUERY_KEY,
  useCurrentFactionWar,
} from "./use-current-faction-war";
import { FACTION_WAR_CHAMPIONS_QUERY_KEY } from "./use-faction-war-champions";

/**
 * Champion highlights: hiding other winners is a choice for this screen
 * only; a winner's own highlight is shown to everyone, so it is saved on the
 * server for the war they won.
 */
export const FactionWarSettings: FC = () => {
  const { t } = useTranslation("factionWar");
  const queryClient = useQueryClient();
  const [hideOthers, setHideOthers] = useHideOtherChampions();
  const { data: war } = useCurrentFactionWar();
  const champion = war?.champion?.isChampion ? war.champion : null;

  const updatePick = useFactionWarsControllerUpdatePick({
    mutation: {
      onMutate: ({ data }) => {
        const previous = queryClient.getQueryData<FactionWarResponseDto>(
          CURRENT_FACTION_WAR_QUERY_KEY,
        );

        if (previous?.champion && data.championHighlightHidden !== undefined) {
          queryClient.setQueryData<FactionWarResponseDto>(
            CURRENT_FACTION_WAR_QUERY_KEY,
            {
              ...previous,
              champion: {
                ...previous.champion,
                highlightHidden: data.championHighlightHidden,
              },
            },
          );
        }

        return { previous };
      },
      onError: (_error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            CURRENT_FACTION_WAR_QUERY_KEY,
            context.previous,
          );
        }

        toast.error(t("settings.ownHighlightError"));
      },
      onSettled: () => {
        // The champions list drops a winner who hid their highlight.
        void queryClient.invalidateQueries({
          queryKey: FACTION_WAR_CHAMPIONS_QUERY_KEY,
        });
        void queryClient.invalidateQueries({
          queryKey: CURRENT_FACTION_WAR_QUERY_KEY,
        });
      },
    },
  });

  return (
    <SettingsTabLayout>
      <SettingsSection title={t("settings.title")}>
        <SettingsRow
          controlId="faction-war-hide-others"
          htmlFor="faction-war-hide-others"
          label={t("settings.hideOthersLabel")}
          description={t("settings.hideOthersDescription")}
        >
          <Switch
            id="faction-war-hide-others"
            checked={hideOthers}
            onCheckedChange={(checked) => setHideOthers(checked)}
          />
        </SettingsRow>
        {champion ? (
          <SettingsRow
            htmlFor="faction-war-own-highlight"
            label={t("settings.ownHighlightLabel")}
            description={t("settings.ownHighlightDescription")}
          >
            <Switch
              id="faction-war-own-highlight"
              checked={!champion.highlightHidden}
              disabled={updatePick.isPending}
              onCheckedChange={(checked) =>
                updatePick.mutate({
                  pathParams: { warId: champion.warId },
                  data: { championHighlightHidden: !checked },
                })
              }
            />
          </SettingsRow>
        ) : null}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
