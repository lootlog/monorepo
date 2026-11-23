import { replaceEqualDeep } from "@tanstack/react-query";

export const shareById = <Item extends { readonly id: string }>(
  previous: readonly Item[],
  next: readonly Item[],
): readonly Item[] => {
  const previousById = new Map(previous.map((item) => [item.id, item]));

  const shared = next.map((item) => {
    const previousItem = previousById.get(item.id);

    return previousItem ? replaceEqualDeep(previousItem, item) : item;
  });

  return shared.length === previous.length &&
    shared.every((item, index) => item === previous[index])
    ? previous
    : shared;
};
