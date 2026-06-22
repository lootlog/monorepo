import { Outlet, createFileRoute } from "@tanstack/react-router";
import { guildDocsListQueryOptions } from "@/features/guild/docs/docs-api";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

function GuildDocsLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Outlet />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/$guildId/docs")({
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      void prefetchRouteQuery(
        context.queryClient,
        guildDocsListQueryOptions(params.guildId),
      ).catch(() => undefined);

      return null;
    }),
  component: GuildDocsLayout,
});
