import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { EmbeddedLootRowsSkeleton } from "../shared/embedded-loot-rows-skeleton";
import type { Loot } from "@/lib/loots/loot-types";
import { LootsListItem } from "@/features/guild/loots-list/components/loots-list/loots-list-item";
import { QueryErrorNotice } from "@/components/common/query-error-notice";

interface MatchingLootsSectionProps {
  loots: Loot[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  isRetrying?: boolean;
  guildId: string;
  npcName: string;
}

export const MatchingLootsSection = ({
  loots,
  isLoading,
  hasError,
  onRetry,
  isRetrying,
  guildId,
  npcName,
}: MatchingLootsSectionProps) => {
  const { t } = useTranslation();

  return (
    <SectionCard data-testid="matching-loots-card" className="overflow-hidden">
      <SectionCardHeader
        icon={Package}
        title={t("events.killDetail.matchingLoots")}
        actions={
          <ChevronLink
            render=<Link
              to="/$guildId"
              params={{ guildId }}
              search={{ npcs: npcName }}
            />
          >
            {t("events.loots.showAll")}
          </ChevronLink>
        }
      />

      {hasError && (
        <QueryErrorNotice
          message={t("events.killDetail.lootsError")}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      )}
      {isLoading ? (
        <EmbeddedLootRowsSkeleton rows={3} />
      ) : loots.length === 0 && !hasError ? (
        <EmptyState
          compact
          icon={Package}
          title={t("events.killDetail.noLoots")}
        />
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
