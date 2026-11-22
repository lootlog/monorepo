import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import {
  findChest,
  findComponent,
  findSymbol,
  hasSocket,
} from "@lootlog/domain/item-socket";
import type { ItemUpgrade } from "@lootlog/domain/item-upgrade";
import { ItemChestSection } from "./item-chest-section";
import { ItemComponentChests } from "./item-component-chests";
import { ItemComponentSection } from "./item-component-section";
import { ItemSocketSection } from "./item-socket-section";
import { ItemSymbolSection } from "./item-symbol-section";

type ItemSocketSectionsProps = {
  item: CatalogItemDtoOutput;
  upgrade: ItemUpgrade;
  onChange: (upgrade: ItemUpgrade) => void;
};

export function ItemSocketSections({
  item,
  upgrade,
  onChange,
}: ItemSocketSectionsProps) {
  const symbol = findSymbol(item.id);
  const component = findComponent(item.id);
  const chest = findChest(item.id);

  return (
    <>
      {hasSocket(item) ? (
        <ItemSocketSection item={item} upgrade={upgrade} onChange={onChange} />
      ) : null}
      {symbol ? <ItemSymbolSection symbol={symbol} /> : null}
      {component ? (
        <>
          <ItemComponentChests component={component} />
          <ItemComponentSection component={component} />
        </>
      ) : null}
      {chest ? <ItemChestSection chest={chest} /> : null}
    </>
  );
}
