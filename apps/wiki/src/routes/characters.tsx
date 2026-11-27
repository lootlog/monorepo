import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { PortalPageHeader } from "@lootlog/ui/components/portal-page-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SignInPrompt } from "@/components/common/sign-in-prompt";
import { SavedCharactersList } from "@/components/equipment/saved-characters-list";
import { useSession } from "@/hooks/use-session";
import { t } from "@/i18n/messages";
import { wikiPageHead } from "@/lib/link-preview";

export const Route = createFileRoute("/characters")({
  component: CharactersRoute,
  head: () =>
    wikiPageHead({
      path: "/characters",
      title: t("savedSets.title"),
      description: t("savedSets.pageDescription"),
      noindex: true,
    }),
});

function CharactersRoute() {
  const { session, isPending } = useSession();

  return (
    <div className="flex flex-col gap-6 py-6">
      <PortalPageHeader
        title={t("savedSets.title")}
        description={t("savedSets.pageDescription")}
      />
      {isPending ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : session ? (
        <SavedCharactersList />
      ) : (
        <Card className="max-w-lg">
          <SignInPrompt
            reason={t("savedSets.signInRequired")}
            className="px-5 pb-0"
          />
        </Card>
      )}
    </div>
  );
}
