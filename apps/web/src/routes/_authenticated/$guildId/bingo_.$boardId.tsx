import { createFileRoute } from "@tanstack/react-router";
import { getBingoControllerGetBoardQueryOptions } from "@lootlog/client/main";
import { BingoDetailPage } from "@/features/guild/bingo/bingo-detail-page";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

function BingoDetailRoute() {
  const { boardId } = Route.useParams();

  return <BingoDetailPage boardId={boardId} />;
}

export const Route = createFileRoute(
  "/_authenticated/$guildId/bingo_/$boardId",
)({
  staticData: {
    navigation: ({ t }) => ({ label: t("bingo.title") }),
  },
  component: BingoDetailRoute,
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      void prefetchRouteQuery(
        context.queryClient,
        getBingoControllerGetBoardQueryOptions({
          guildId: params.guildId,
          boardId: params.boardId,
        }),
      );

      return null;
    }),
});
