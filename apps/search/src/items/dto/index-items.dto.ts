export type IndexItemsDto = {
  items: Array<{
    id: number;
    hid: string;
    name: string;
    icon: string;
    lvl: number;
    rarity: string | null;
    type: string | null;
    world: string;
  }>;
};
