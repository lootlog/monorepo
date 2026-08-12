import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Frown, Package } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import type { Loot } from "@/lib/loots/loot-types";
import { LootsListItem } from "@/features/guild/loots-list/components/loots-list/loots-list-item";

interface MatchingLootsSectionProps {
  loots: Loot[];
  isLoading: boolean;
  guildId: string;
  npcName: string;
}

export const MatchingLootsSection = ({
  loots,
  isLoading,
  guildId,
  npcName,
}: MatchingLootsSectionProps) => {
  const { t } = useTranslation();

  return (
    <section
      data-testid="matching-loots-card"
      className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Package className="size-4 shrink-0 text-primary" />
          <span className="truncate">
            {t("events.killDetail.matchingLoots")}
          </span>
        </h2>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 shrink-0 px-2 text-xs text-muted-foreground"
        >
          <Link to="/$guildId" params={{ guildId }} search={{ npcs: npcName }}>
            {t("events.loots.showAll")}
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="divide-y divide-border/70">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="px-3 py-3">
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ))}
        </div>
      ) : loots.length === 0 ? (
        <div className="flex min-h-28 flex-col items-center justify-center px-4 py-6 text-center text-muted-foreground">
          <Frown className="mb-2 size-6 opacity-50" />
          <p className="text-sm">{t("events.killDetail.noLoots")}</p>
        </div>
      ) : (
        <div className="divide-y divide-border/70">
          {loots.map((loot) => (
            <LootsListItem key={loot.id} loot={loot} variant="embedded" />
          ))}
        </div>
      )}
    </section>
  );
};
