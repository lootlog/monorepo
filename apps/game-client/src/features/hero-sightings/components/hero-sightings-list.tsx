import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/empty-state";
import type { HeroSightingRow } from "@/features/hero-sightings/hero-sighting-rows";
import { HeroSightingItem } from "@/features/hero-sightings/components/hero-sighting-item";
import { useNow } from "@/hooks/ui/use-now";

type HeroSightingsListProps = {
  rows: readonly HeroSightingRow[];
  userId: string | undefined;
  writableGuildIds: ReadonlySet<string>;
};

export function HeroSightingsList({
  rows,
  userId,
  writableGuildIds,
}: HeroSightingsListProps) {
  const { t } = useTranslation("heroSightings");
  const now = useNow(60_000);

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t("emptyState.title")}
        description={t("emptyState.description")}
      />
    );
  }

  return (
    <ul className="ll:m-0 ll:list-none ll:p-0">
      {rows.map((row) => (
        <li key={row.key}>
          <HeroSightingItem
            row={row}
            now={now}
            userId={userId}
            writableGuildIds={writableGuildIds}
          />
        </li>
      ))}
    </ul>
  );
}
