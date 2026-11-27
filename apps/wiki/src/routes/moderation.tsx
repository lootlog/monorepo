import { createFileRoute } from "@tanstack/react-router";
import { useCatalogReportsControllerGetViewer } from "@lootlog/client/catalog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { PortalPageHeader } from "@lootlog/ui/components/portal-page-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { RecordingImport } from "@/components/recordings/recording-import";
import { ModerationQueue } from "@/components/reports/moderation-queue";
import { useSession } from "@/hooks/use-session";
import { useSignedInCatalogRequest } from "@/hooks/use-signed-in-catalog-request";
import { t } from "@/i18n/messages";

const MODERATION_TABS = ["reports", "recordings"] as const;

type ModerationTab = (typeof MODERATION_TABS)[number];

const isModerationTab = (value: unknown): value is ModerationTab =>
  MODERATION_TABS.some((tab) => tab === value);

export const Route = createFileRoute("/moderation")({
  component: ModerationRoute,
  validateSearch: (search: { tab?: unknown }): { tab?: ModerationTab } =>
    isModerationTab(search.tab) && search.tab !== "reports"
      ? { tab: search.tab }
      : {},
  head: () => ({
    meta: [
      { title: `${t("moderation.title")} | ${t("meta.title")}` },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ModerationRoute() {
  const { tab = "reports" } = Route.useSearch();
  const navigate = Route.useNavigate();
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
        <PortalPageHeader title={t("moderation.title")} />
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

  return (
    <div className="flex flex-col gap-6 py-6">
      <PortalPageHeader title={t("moderation.title")} />
      <Tabs
        value={tab}
        onValueChange={(next) => {
          if (!isModerationTab(next)) return;
          void navigate({
            search: next === "reports" ? {} : { tab: next },
            replace: true,
          });
        }}
        className="gap-6"
      >
        <TabsList variant="underline" aria-label={t("moderation.tabsLabel")}>
          {MODERATION_TABS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`moderation.tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="reports">
          <ModerationQueue />
        </TabsContent>
        <TabsContent value="recordings">
          <RecordingImport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
