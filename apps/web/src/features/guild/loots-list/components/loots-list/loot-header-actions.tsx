import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LootLikeButton } from "@/features/guild/loots-list/components/loots-list/loot-like-button";
import type { Loot } from "@/lib/loots/loot-types";

/**
 * Keeps the current page and its filters and opens the loot details dialog
 * over it. The router parses search params as strings (see `App.tsx`).
 */
const renderLootDetailsLink = (lootId: number) => (
  <Link
    to="."
    resetScroll={false}
    search={(previous: Record<string, string | string[]>) => ({
      ...previous,
      lootId: String(lootId),
    })}
  />
);

export const LootHeaderActions = ({ loot }: { loot: Loot }) => {
  const { t } = useTranslation();
  const { commentsCount, id: lootId } = loot;

  const commentsLabel = t("loots.list.commentsCount", { count: commentsCount });

  return (
    <div className="flex shrink-0 items-center gap-3">
      <LootLikeButton loot={loot} />
      <TextLink
        render={renderLootDetailsLink(lootId)}
        aria-label={commentsLabel}
        title={commentsLabel}
        className={cn(
          "inline-flex h-8 items-center gap-1 tabular-nums",
          commentsCount > 0 && "text-foreground",
        )}
      >
        <MessageSquare aria-hidden className="size-3.5 shrink-0" />
        {commentsCount}
      </TextLink>
      <ChevronLink
        render={renderLootDetailsLink(lootId)}
        aria-label={t("loots.list.details")}
        // On phones only the chevron shows; keep a 32px target behind it.
        className="max-sm:min-w-8 max-sm:justify-end"
      >
        <span className="max-sm:sr-only">{t("loots.list.details")}</span>
      </ChevronLink>
    </div>
  );
};
