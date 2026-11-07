import type { CatalogNpcDtoOutput } from "@lootlog/client/catalog";
import { t } from "@/i18n/messages";

const dayFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "long",
  timeZone: "UTC",
});

/**
 * The levels a monster had before the game changed it, oldest first. A
 * search API released before former levels existed sends none.
 */
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
              date: dayFormat.format(new Date(`${until}T00:00:00Z`)),
            }),
          )
          .join(", "),
      })}
    </p>
  );
}
