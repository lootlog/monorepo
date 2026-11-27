import { createFileRoute } from "@tanstack/react-router";
import { getBingoControllerGetBoardQueryOptions } from "@lootlog/client/main";
import { BingoDetailPage } from "@/features/guild/bingo/bingo-detail-page";
import { BingoDetailSkeleton } from "@/features/guild/bingo/bingo-detail-skeleton";
import { parseBingoBoardSearch } from "@/features/guild/bingo/bingo-board-search";
import { getBingoBoardName } from "@/features/guild/bingo/bingo-route-navigation";
import { ROUTES } from "@/config/routes";
import {
  rethrowNotFoundOrError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";
import { ensureRouteQueryData } from "@/lib/router/route-prefetch";

function BingoDetailRoute() {
  const { boardId } = Route.useParams();
  const { member } = Route.useSearch();

  return <BingoDetailPage boardId={boardId} inspectedMemberId={member} />;
}

export const Route = createFileRoute(
  "/_authenticated/$guildId/bingo_/$boardId",
)({
  staticData: {
    navigation: ({ t, match }) => {
      const name = getBingoBoardName(match);

      return {
        ancestors: [
          {
            label: t("bingo.title"),
            path: ROUTES.guild.bingo.base(match.params?.guildId ?? ""),
          },
        ],
        label: name ?? t("bingo.board.fallbackTitle"),
        documentContext: name,
      };
    },
  },
  validateSearch: parseBingoBoardSearch,
  component: BingoDetailRoute,
  pendingComponent: BingoDetailSkeleton,
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      try {
        const { board } = await ensureRouteQueryData(
          context.queryClient,
          getBingoControllerGetBoardQueryOptions({
            guildId: params.guildId,
            boardId: params.boardId,
          }),
        );

        return { board };
      } catch (error) {
        rethrowNotFoundOrError(error);
      }
    }),
});
