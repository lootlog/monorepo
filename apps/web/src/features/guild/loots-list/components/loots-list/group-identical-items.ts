import type { Item } from "@/lib/loots/loot-types";

export type IdenticalItems = {
  item: Item;
  /** Each copy's own identifier, in the order they dropped. */
  hids: string[];
};

/** Copies of one item template collapse into one entry, in first-drop order. */
export const groupIdenticalItems = (items: Item[]): IdenticalItems[] => {
  const groups = new Map<Item["id"], IdenticalItems>();

  for (const item of items) {
    const group = groups.get(item.id);

    if (group) {
      group.hids.push(item.hid);
    } else {
      groups.set(item.id, { item, hids: [item.hid] });
    }
  }

  return [...groups.values()];
};
