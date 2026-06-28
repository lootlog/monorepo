import { createFileRoute } from "@tanstack/react-router";
import { GuildDocEditorPage } from "@/features/guild/docs/guild-doc-editor-page";
import { GuildDocEditorSkeleton } from "@/features/guild/docs/guild-doc-editor-skeleton";
import { guildDocDetailQueryOptions } from "@/features/guild/docs/docs-api";
import {
  rethrowNotFoundOrError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";
import { ensureRouteQueryData } from "@/lib/router/route-prefetch";

export const Route = createFileRoute("/_authenticated/$guildId/docs/$docId")({
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      try {
        const document = await ensureRouteQueryData(
          context.queryClient,
          guildDocDetailQueryOptions(params.guildId, params.docId),
        );

        return { document };
      } catch (error) {
        rethrowNotFoundOrError(error);
      }
    }),
  component: GuildDocEditorPage,
  pendingComponent: GuildDocEditorSkeleton,
});
