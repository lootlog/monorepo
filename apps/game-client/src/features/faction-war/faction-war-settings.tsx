import {
  useFactionWarsControllerUpdatePick,
  type FactionWarResponseDto,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import {
  useHideOtherChampions,
  useShowFactionWarPoints,
} from "./faction-war-preferences";
import {
  CURRENT_FACTION_WAR_QUERY_KEY,
  useCurrentFactionWar,
} from "./use-current-faction-war";
import { FACTION_WAR_CHAMPIONS_QUERY_KEY } from "./use-faction-war-champions";

type PickUpdate = {
  hiddenFromLeaderboard?: boolean;
  championHighlightHidden?: boolean;
};

/** The war as the server will answer after `update`, shown right away. */
const applyPickUpdate = (
  war: FactionWarResponseDto,
  update: PickUpdate,
): FactionWarResponseDto => ({
  ...war,
  pick:
    war.pick && update.hiddenFromLeaderboard !== undefined
      ? { ...war.pick, hiddenFromLeaderboard: update.hiddenFromLeaderboard }
      : war.pick,
  champion:
    war.champion && update.championHighlightHidden !== undefined
      ? { ...war.champion, highlightHidden: update.championHighlightHidden }
      : war.champion,
});

/**
 * The faction war on this screen and on the Lootlog website: point toasts
 * and hiding other winners are choices for this screen only; the ranking
 * entry and a winner's own highlight are shown to everyone, so they are
 * saved on the server.
 */
export const FactionWarSettings: FC = () => {
  const { t } = useTranslation("factionWar");
  const queryClient = useQueryClient();
  const [hideOthers, setHideOthers] = useHideOtherChampions();
  const [showPoints, setShowPoints] = useShowFactionWarPoints();
  const { data: war } = useCurrentFactionWar();
  const pick = war?.pick ?? null;
  const champion = war?.champion?.isChampion ? war.champion : null;

  const updatePick = useFactionWarsControllerUpdatePick({
    mutation: {
      onMutate: ({ data }) => {
        const previous = queryClient.getQueryData<FactionWarResponseDto>(
          CURRENT_FACTION_WAR_QUERY_KEY,
        );

        if (previous) {
          queryClient.setQueryData<FactionWarResponseDto>(
            CURRENT_FACTION_WAR_QUERY_KEY,
            applyPickUpdate(previous, data),
          );
        }

        return { previous };
      },
      onError: (_error, { data }, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            CURRENT_FACTION_WAR_QUERY_KEY,
            context.previous,
          );
        }

        toast.error(
          data.hiddenFromLeaderboard === undefined
            ? t("settings.ownHighlightError")
            : t("settings.hideFromLeaderboardError"),
        );
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
      <SettingsSection title={t("settings.warTitle")}>
        {pick?.disqualified ? (
          <SettingsRow
            label={t("settings.disqualified")}
            labelClassName="ll:text-red-300"
            description={t("settings.disqualifiedDescription")}
          >
            <Ban aria-hidden="true" className="ll:size-4 ll:text-red-300" />
          </SettingsRow>
        ) : null}
        <SettingsRow
          controlId="faction-war-show-points"
          htmlFor="faction-war-show-points"
          label={t("settings.showPointsLabel")}
          description={t("settings.showPointsDescription")}
        >
          <Switch
            id="faction-war-show-points"
            checked={showPoints}
            onCheckedChange={(checked) => setShowPoints(checked)}
          />
        </SettingsRow>
        {war && pick && !pick.disqualified ? (
          <SettingsRow
            htmlFor="faction-war-hide-from-leaderboard"
            label={t("settings.hideFromLeaderboardLabel")}
            description={t("settings.hideFromLeaderboardDescription")}
          >
            <Switch
              id="faction-war-hide-from-leaderboard"
              checked={pick.hiddenFromLeaderboard}
              disabled={updatePick.isPending}
              onCheckedChange={(checked) =>
                updatePick.mutate({
                  pathParams: { warId: war.id },
                  data: { hiddenFromLeaderboard: checked },
                })
              }
            />
          </SettingsRow>
        ) : null}
      </SettingsSection>
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
