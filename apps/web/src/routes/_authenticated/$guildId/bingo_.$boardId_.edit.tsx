import { createFileRoute } from "@tanstack/react-router";
import { getBingoControllerGetBoardQueryOptions } from "@lootlog/client/main";
import { BingoEditPage } from "@/features/guild/bingo/bingo-edit-page";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

function BingoEditRoute() {
  const { boardId } = Route.useParams();

  return <BingoEditPage boardId={boardId} />;
}

export const Route = createFileRoute(
  "/_authenticated/$guildId/bingo_/$boardId_/edit",
)({
  staticData: {
    navigation: ({ t }) => ({ label: t("bingo.edit") }),
  },
  component: BingoEditRoute,
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
