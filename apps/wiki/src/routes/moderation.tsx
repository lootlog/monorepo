import { createFileRoute } from "@tanstack/react-router";
import { useCatalogReportsControllerGetViewer } from "@lootlog/client/catalog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { ModerationQueue } from "@/components/reports/moderation-queue";
import { useSession } from "@/hooks/use-session";
import { useSignedInCatalogRequest } from "@/hooks/use-signed-in-catalog-request";
import { t } from "@/i18n/messages";

export const Route = createFileRoute("/moderation")({
  component: ModerationRoute,
  head: () => ({
    meta: [
      { title: `${t("moderation.title")} | ${t("meta.title")}` },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/** The reports readers sent about catalog pages, for the moderators to review. */
function ModerationRoute() {
  const { session, isPending } = useSession();
  const request = useSignedInCatalogRequest();

  const viewer = useCatalogReportsControllerGetViewer({
    query: { enabled: session !== null },
    request,
  });

  if (isPending || (session && viewer.isPending)) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!session || !viewer.data?.canModerate) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <PageHeader title={t("moderation.title")} />
        <p
          role={viewer.isError ? "alert" : undefined}
          className="text-sm text-muted-foreground"
        >
          {!session
            ? t("moderation.signInRequired")
            : viewer.isError
              ? t("moderation.loadError")
              : t("moderation.moderatorsOnly")}
        </p>
      </div>
    );
  }

  return <ModerationQueue />;
}
