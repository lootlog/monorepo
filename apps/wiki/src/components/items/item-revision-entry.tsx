import type { CatalogItemRevisionDtoOutput } from "@lootlog/client/catalog";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { resolveItemRarity } from "@lootlog/domain/item-rarity";
import { ArrowRight } from "lucide-react";
import { ItemStatLine } from "@lootlog/ui/components/item-stat-line";
import { t } from "@/i18n/messages";
import {
  findStatRevisions,
  formatRevisionDays,
} from "@/lib/item-revision-changes";

export function ItemRevisionEntry({
  revision,
  rarity,
  elasticLevel,
}: {
  revision: CatalogItemRevisionDtoOutput;
  rarity: string | null;
  elasticLevel: boolean;
}) {
  const stats = findStatRevisions(revision);
  const frame = resolveItemRarity(rarity);

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">
          <time dateTime={revision.changedBy}>
            {formatRevisionDays(revision)}
          </time>
        </h3>
        {elasticLevel ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("revisions.atLevel", { level: revision.lvl })}
          </span>
        ) : null}
      </div>
      <ul className="divide-y divide-border/60">
        {revision.previousName === revision.name ? null : (
          <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 text-sm">
            <span className="text-muted-foreground line-through">
              {revision.previousName}
            </span>
            <ArrowRight
              aria-label={t("revisions.became")}
              role="img"
              className="size-3.5 text-muted-foreground"
            />
            <span className="text-foreground">{revision.name}</span>
          </li>
        )}
        {revision.previousIcon === revision.icon ? null : (
          <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <ItemImage icon={revision.previousIcon} rarity={frame} />
              {t("revisions.icon")}
            </span>
            <ArrowRight
              aria-label={t("revisions.became")}
              role="img"
              className="size-3.5 text-muted-foreground"
            />
            <span className="flex items-center gap-2 text-foreground">
              <ItemImage icon={revision.icon} rarity={frame} />
              {t("revisions.newIcon")}
            </span>
          </li>
        )}
        {stats.map(({ key, before, after }) => (
          <li
            key={key}
            className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 text-sm"
          >
            <span className="min-w-0 text-pretty text-muted-foreground">
              {before ? (
                <ItemStatLine displayValue={before} />
              ) : (
                t("revisions.none")
              )}
            </span>
            <ArrowRight
              aria-label={t("revisions.became")}
              role="img"
              className="size-3.5 text-muted-foreground"
            />
            <span className="min-w-0 text-pretty text-foreground">
              {after ? (
                <ItemStatLine displayValue={after} />
              ) : (
                t("revisions.removed")
              )}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}
