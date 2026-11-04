import { createFileRoute } from "@tanstack/react-router";
import { GuildDocEditorPage } from "@/features/guild/docs/guild-doc-editor-page";
import { GuildDocEditorSkeleton } from "@/features/guild/docs/guild-doc-editor-skeleton";
import { guildDocDetailQueryOptions } from "@/features/guild/docs/docs-api";
import {
  rethrowNotFoundOrError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";
import { ensureRouteQueryData } from "@/lib/router/route-prefetch";
import { Option, Schema } from "effect";

const decodeDocumentLoaderData = Schema.decodeUnknownOption(
  Schema.Struct({
    document: Schema.optional(
      Schema.Struct({ title: Schema.optional(Schema.String) }),
    ),
  }),
);

export const Route = createFileRoute("/_authenticated/$guildId/docs/$docId")({
  staticData: {
    navigation: ({ t, match, currentEntityLabel }) => ({
      label:
        Option.getOrUndefined(decodeDocumentLoaderData(match.loaderData))
          ?.document?.title ??
        currentEntityLabel ??
        t("common.breadcrumbs.docFallback", { id: match.params?.docId }),
    }),
  },
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
