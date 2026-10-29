import { groupBy } from "es-toolkit";
import type {
  CatalogDropSourceDtoOutput,
  CatalogItemDtoOutput,
} from "@lootlog/client/search";

type MonsterItem = {
  monster: CatalogDropSourceDtoOutput | undefined;
  item: CatalogItemDtoOutput;
};

/**
 * Items under each monster they drop from, in the order the items come; an
 * item that drops from several is listed under each. Items name a monster by
 * any of its identities, so monsters are told apart by name and type. Items
 * with no source that `isMonster` accepts share a group without a monster.
 */
export const groupItemsByMonster = (
  items: readonly CatalogItemDtoOutput[],
  isMonster: (source: CatalogDropSourceDtoOutput) => boolean = () => true,
) => {
  const pairs = items.flatMap((item): MonsterItem[] => {
    const monsters = item.droppedBy.filter(isMonster);

    return monsters.length > 0
      ? monsters.map((monster) => ({ monster, item }))
      : [{ monster: undefined, item }];
  });

  return Object.values(
    groupBy(pairs, ({ monster }) =>
      monster ? `${monster.name}|${monster.type}` : "",
    ),
  ).map((group) => ({
    monster: group[0]?.monster,
    items: group.map(({ item }) => item),
  }));
};
