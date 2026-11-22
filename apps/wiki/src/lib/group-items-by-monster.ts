import { groupBy } from "es-toolkit";
import type {
  CatalogDropSourceDtoOutput,
  CatalogItemDtoOutput,
} from "@lootlog/client/catalog";

type MonsterItem = {
  monster: CatalogDropSourceDtoOutput | undefined;
  item: CatalogItemDtoOutput;
};

export const monsterIdentity = ({
  name,
  type,
}: Pick<CatalogDropSourceDtoOutput, "name" | "type">) => `${name}|${type}`;

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
    groupBy(pairs, ({ monster }) => (monster ? monsterIdentity(monster) : "")),
  ).map((group) => ({
    monster: group[0]?.monster,
    items: group.map(({ item }) => item),
  }));
};
