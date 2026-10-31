import { AlertCircle, ShieldHalf } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { FactionWarHero } from "./faction-war-hero";
import {
  FactionWarPageTabs,
  type FactionWarTab,
} from "./faction-war-page-tabs";
import { useCurrentFactionWar, type FactionWar } from "./faction-war-queries";

type FactionWarLayoutProps = {
  tab: FactionWarTab;
  /** The tab's content once the war has loaded. */
  children: (war: FactionWar) => ReactNode;
};

/**
 * Every section of the war opens with its banner and the section tabs, in
 * one page scroller marked `data-under-top-bar` so the tabs stay pinned.
 */
export const FactionWarLayout = ({ tab, children }: FactionWarLayoutProps) => {
  const { t } = useTranslation();
  const war = useCurrentFactionWar();

  const renderContent = () => {
    if (war.data) {
      return (
        <>
          <FactionWarHero war={war.data} />
          <FactionWarPageTabs activeId={tab} />
          {children(war.data)}
        </>
      );
    }

    if (war.isPending) {
      return (
        <div aria-busy="true">
          <h1 className="sr-only">{t("layout.navigation.factionWar")}</h1>
          <Skeleton className="h-80 w-full rounded-none border-b border-border lg:h-96" />
          <FactionWarPageTabs activeId={tab} />
          <Skeleton className="m-3 h-64 rounded-lg sm:m-4" />
        </div>
      );
    }

    const isMissing = war.error?.status === 404;

    return (
      <div className="p-3">
        <h1 className="sr-only">{t("layout.navigation.factionWar")}</h1>
        <EmptyState
          fill
          icon={isMissing ? ShieldHalf : AlertCircle}
          title={t(
            isMissing ? "factionWar.empty.title" : "factionWar.error.title",
          )}
          description={t(
            isMissing
              ? "factionWar.empty.description"
              : "factionWar.error.description",
          )}
          action={
            isMissing ? undefined : (
              <Button
                variant="outline"
                loading={war.isFetching}
                onClick={() => void war.refetch()}
              >
                {t("common.actions.retry")}
              </Button>
            )
          }
        />
      </div>
    );
  };

  return (
    <ScrollArea data-under-top-bar className="h-full min-h-0">
      {renderContent()}
    </ScrollArea>
  );
};
