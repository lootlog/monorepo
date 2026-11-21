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
  /** The item as dropped, at the level it is shown at. */
  item: CatalogItemDtoOutput;
  upgrade: ItemUpgrade;
  onChange: (upgrade: ItemUpgrade) => void;
};

/**
 * What an item page shows of sockets and symbols: the symbol in a socketed
 * item, how a symbol is fused, where a component comes from and which
 * symbols it goes into, or what a chest of components gives.
 */
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
