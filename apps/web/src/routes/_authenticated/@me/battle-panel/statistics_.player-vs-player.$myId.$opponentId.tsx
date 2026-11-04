import { createFileRoute } from "@tanstack/react-router";
import { Option, Schema } from "effect";
import { ROUTES } from "@/config/routes";
import type { RouteNavigation } from "@/navigation/app-navigation";
import { PlayerVsPlayerFullPage } from "@/features/user/battle-panel/battle-panel-statistics/player-vs-player-full-page";
import { BattlePanelH2hSkeleton } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";
import { BattlePanelPvpBattleCardSkeleton } from "@/features/user/battle-panel/components/battle-panel-pvp-battle-card-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/user/battle-panel/battle-panel-route-loader";
import {
  battlePanelPlayerVsPlayerSearchSchema,
  loadBattlePanelPlayerVsPlayerSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-search";
import { getBattlesControllerGetPlayerVsPlayerBattlesQueryOptions } from "@lootlog/client/battlelog";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { buildPlayerVsPlayerParams } from "@/features/user/battle-panel/battle-panel-request-params";

const decodeAbyssSeasonSearch = Schema.decodeUnknownOption(
  Schema.Struct({ seasonId: Schema.String, characterId: Schema.String }),
);

// Opened from an Abyss season, the page returns to that season's opponents.
const resolvePlayerVsPlayerNavigation: RouteNavigation = ({ t, match }) => {
  const abyssSeason = Option.getOrUndefined(
    decodeAbyssSeasonSearch(match.search),
  );

  if (!abyssSeason) {
    return {
      ancestors: [
        {
          label: t("layout.breadcrumbs.opponents"),
          path: ROUTES.user.battlePanel.opponents,
        },
      ],
      label: t("layout.breadcrumbs.playerVsPlayer"),
    };
  }

  const { seasonId, characterId } = abyssSeason;

  return {
    ancestors: [
      {
        label: t("layout.breadcrumbs.abyss"),
        path: ROUTES.user.battlePanel.abyss,
        search: { characterId },
      },
      {
        label: t("layout.breadcrumbs.abyssSeason"),
        path: `${ROUTES.user.battlePanel.abyss}/${seasonId}/opponents`,
        search: { characterId },
      },
    ],
    label: t("layout.breadcrumbs.playerVsPlayer"),
  };
};

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/player-vs-player/$myId/$opponentId",
)({
  staticData: {
    navigation: resolvePlayerVsPlayerNavigation,
  },
  validateSearch: battlePanelPlayerVsPlayerSearchSchema,
  loader: ({ abortController, context, location, params, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      const search = loadBattlePanelPlayerVsPlayerSearch(location.searchStr);

      const characterId =
        (await ensureBattlePanelCharacterId({
          queryClient: context.queryClient,
          characterId:
            normalizeBattlePanelCharacterId(search.characterId) ?? params.myId,
        })) ?? params.myId;

      await context.queryClient.ensureQueryData(
        getBattlesControllerGetPlayerVsPlayerBattlesQueryOptions(
          buildPlayerVsPlayerParams(search, {
            characterId,
            opponentId: params.opponentId,
          }),
        ),
      );

      return null;
    }),
  component: PlayerVsPlayerFullPage,
  pendingComponent: () => (
    <BattlePanelH2hSkeleton
      variant="player-vs-player"
      mobileCard={<BattlePanelPvpBattleCardSkeleton />}
    />
  ),
});
