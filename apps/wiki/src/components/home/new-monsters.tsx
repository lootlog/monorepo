import { t } from "@/i18n/messages";
import { useNewBosses } from "@/hooks/use-new-bosses";
import { NewItemsCardsSkeleton } from "./new-items-cards-skeleton";
import { NewMonsterCard } from "./new-monster-card";

const MONSTERS_SHOWN = 4;

export function NewMonsters() {
  const { bosses, isError } = useNewBosses();

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (!bosses) return <NewItemsCardsSkeleton count={MONSTERS_SHOWN} />;

  const monsters = bosses.slice(0, MONSTERS_SHOWN);

  if (monsters.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("home.newMonstersEmpty")}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {monsters.map((monster) => (
        <li key={monster.key}>
          <NewMonsterCard monster={monster} />
        </li>
      ))}
    </ul>
  );
}
