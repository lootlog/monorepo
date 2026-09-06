import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Frown, Package } from "lucide-react";
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
    <SectionCard
      data-testid="matching-loots-card"
      className="min-w-0 overflow-hidden bg-card"
    >
      <SectionCardHeader
        icon={Package}
        title={t("events.killDetail.matchingLoots")}
        actions={
          <>
            <ChevronLink
              className="inline-flex h-8 shrink-0 items-center gap-1 text-xs"
              render={
                <Link
                  to="/$guildId"
                  params={{ guildId }}
                  search={{ npcs: npcName }}
                />
              }
            >
              {t("events.loots.showAll")}
            </ChevronLink>
          </>
        }
      />

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
    </SectionCard>
  );
};
