import { createFileRoute } from "@tanstack/react-router";
import { getBingoControllerGetBoardQueryOptions } from "@lootlog/client/main";
import { BingoEditPage } from "@/features/guild/bingo/bingo-edit-page";
import { getBingoBoardName } from "@/features/guild/bingo/bingo-route-navigation";
import { ROUTES } from "@/config/routes";
import {
  rethrowNotFoundOrError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";
import { ensureRouteQueryData } from "@/lib/router/route-prefetch";

function BingoEditRoute() {
  const { boardId } = Route.useParams();

  return <BingoEditPage boardId={boardId} />;
}

export const Route = createFileRoute(
  "/_authenticated/$guildId/bingo_/$boardId_/edit",
)({
  staticData: {
    navigation: ({ t, match }) => {
      const guildId = match.params?.guildId ?? "";
      const boardId = match.params?.boardId ?? "";
      const name = getBingoBoardName(match);

      return {
        ancestors: [
          { label: t("bingo.title"), path: ROUTES.guild.bingo.base(guildId) },
          {
            label: name ?? t("bingo.board.fallbackTitle"),
            path: ROUTES.guild.bingo.board(guildId, boardId),
          },
        ],
        label: t("bingo.edit"),
        documentContext: name,
      };
    },
  },
  component: BingoEditRoute,
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
