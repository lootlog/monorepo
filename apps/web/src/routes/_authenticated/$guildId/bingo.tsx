import { createFileRoute } from "@tanstack/react-router";
import { getBingoControllerListBoardsQueryOptions } from "@lootlog/client/main";
import { BingoListPage } from "@/features/guild/bingo/bingo-list-page";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

export const Route = createFileRoute("/_authenticated/$guildId/bingo")({
  staticData: {
    navigation: ({ t }) => ({ label: t("bingo.title") }),
  },
  component: BingoListPage,
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      void prefetchRouteQuery(
        context.queryClient,
        getBingoControllerListBoardsQueryOptions({
          guildId: params.guildId,
        }),
      );

      return null;
    }),
});
