import { NpcPortrait } from "@/components/common/npc-portrait";
import { t } from "@/i18n/messages";
import { npcSummary } from "@/lib/npc-summary";
import { useNewBosses } from "@/hooks/use-new-bosses";
import { npcPageParams } from "@/lib/catalog-links";
import { NewItemsCard } from "./new-items-card";
import { NewItemsCardsSkeleton } from "./new-items-cards-skeleton";

const MONSTERS_SHOWN = 4;

/** The bosses behind the game's newest items, with those items. */
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
      {monsters.map(({ monster, items }) => (
        <li key={monster.key}>
          <NewItemsCard
            title={monster.name}
            eyebrow={npcSummary(monster)}
            media={<NpcPortrait icon={monster.icon} size="md" />}
            link={{ to: "/npcs/$npcSlug", params: npcPageParams(monster) }}
            items={items}
            itemCount={items.length}
          />
        </li>
      ))}
    </ul>
  );
}
