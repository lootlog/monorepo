import {
  chestComponents,
  type ComponentChest,
} from "@lootlog/domain/item-socket";
import { ArticleSection } from "@/components/article/article-section";
import { SocketItem } from "@/components/sockets/socket-item";
import { useSocketItems } from "@/hooks/use-socket-items";
import { t } from "@/i18n/messages";
import { formatChestChance } from "@/lib/chest-chance";

/** What opening a chest of components gives, with each one's chance. */
export function ItemChestSection({ chest }: { chest: ComponentChest }) {
  const itemsById = useSocketItems();
  const range = { min: chest.tier.minLevel, max: chest.tier.maxLevel };

  return (
    <ArticleSection
      id="item-chest-contents"
      title={t("socket.chests.contents")}
      description={
        chest.components > 1
          ? t("socket.chests.two", range)
          : t("socket.chests.one", range)
      }
    >
      <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {chestComponents(chest).map(({ id, chance }) => (
          <li key={id}>
            <SocketItem
              item={itemsById.get(id)}
              detail={formatChestChance(chest, chance)}
            />
          </li>
        ))}
      </ul>
    </ArticleSection>
  );
}
