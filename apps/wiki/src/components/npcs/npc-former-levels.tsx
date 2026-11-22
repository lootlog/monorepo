import type { CatalogNpcDtoOutput } from "@lootlog/client/catalog";
import { t } from "@/i18n/messages";
import { formatCatalogDay } from "@/lib/catalog-days";

export function NpcFormerLevels({
  formerLevels,
}: {
  formerLevels: CatalogNpcDtoOutput["formerLevels"] | undefined;
}) {
  if (!formerLevels?.length) return null;

  return (
    <p className="text-sm text-muted-foreground">
      {t("catalog.formerLevels", {
        levels: formerLevels
          .map(({ lvl, until }) =>
            t("catalog.formerLevel", {
              level: lvl,
              date: formatCatalogDay(until),
            }),
          )
          .join(", "),
      })}
    </p>
  );
}
