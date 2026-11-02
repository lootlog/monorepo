import { ItemTile } from "@/components/tiles/item-tile";
import { useLootItemByHid } from "@/hooks/api/use-loot-item-by-hid";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useCopyItemId } from "@/hooks/use-copy-item-id";
import { parseItemHid } from "@/lib/utils/hid-detection";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { Button } from "@lootlog/ui/components/button";
import { Spinner } from "@lootlog/ui/components/spinner";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { cn } from "cn";
import { Copy, PackageSearch, PackageX, Pencil } from "lucide-react";
import { $getNodeByKey, type NodeKey } from "lexical";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  $isGuildDocItemNode,
  EDIT_GUILD_DOC_ITEM_COMMAND,
  lootItemToGuildDocSnapshot,
  type GuildDocItem,
} from "./guild-doc-item-node";

type GuildDocItemChipProps = {
  item: GuildDocItem;
  nodeKey: NodeKey;
};

/**
 * An item in a document: its icon opens the same tooltip as on the loot list,
 * its name takes the rarity colour, and a pasted in-game identifier is one
 * click from the clipboard. An identifier without its item looks it up among
 * the loots; a writer's editor keeps what it finds.
 */
export const GuildDocItemChip = ({ item, nodeKey }: GuildDocItemChipProps) => {
  const { t } = useTranslation();
  const [editor] = useLexicalComposerContext();
  const editable = useLexicalEditable();
  const { copyItemId, copyingId } = useCopyItemId();
  const { snapshot: savedSnapshot, itemId } = item;

  const lootItemQuery = useLootItemByHid(
    useGuildId(),
    savedSnapshot ? null : parseItemHid(itemId ?? ""),
  );

  const lootItem = lootItemQuery.data;

  useEffect(() => {
    if (!editable || !lootItem) {
      return;
    }

    editor.update(() => {
      const node = $getNodeByKey(nodeKey);

      if ($isGuildDocItemNode(node) && !node.getItem().snapshot) {
        node.setItem({
          snapshot: lootItemToGuildDocSnapshot(lootItem),
          itemId: node.getItem().itemId,
        });
      }
    });
  }, [editable, editor, lootItem, nodeKey]);

  const snapshot =
    savedSnapshot ?? (lootItem ? lootItemToGuildDocSnapshot(lootItem) : null);

  const label = snapshot?.name ?? itemId ?? t("docs.item.unknown");

  const renderBody = () => {
    if (snapshot) {
      const rarity = resolveItemRarity(snapshot.rarity);

      return (
        <>
          <ItemTile item={{ ...snapshot, rarity }} />
          <span
            className={cn(
              "font-medium break-words",
              LOOT_RARITY_TEXT_CLASS[rarity],
            )}
          >
            {snapshot.name}
          </span>
        </>
      );
    }

    if (itemId && lootItemQuery.isFetching) {
      return (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Spinner className="size-4" />
          {t("docs.item.loading")}
        </span>
      );
    }

    if (itemId) {
      return (
        <span
          className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground"
          title={itemId}
        >
          <PackageSearch aria-hidden="true" className="size-4 shrink-0" />
          <code className="max-w-48 truncate font-mono text-xs">{itemId}</code>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <PackageX aria-hidden="true" className="size-4" />
        {t("docs.item.unknown")}
      </span>
    );
  };

  return (
    <span className="inline-flex items-center gap-2 align-middle">
      {renderBody()}
      {itemId && (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="shrink-0 text-muted-foreground"
          aria-label={t("docs.item.copyId", { name: label })}
          title={itemId}
          loading={copyingId === itemId}
          disabled={copyingId !== null}
          onClick={() => void copyItemId(itemId)}
        >
          <Copy className="size-3.5" />
        </Button>
      )}
      {editable && (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="-ml-1.5 shrink-0 text-muted-foreground"
          aria-label={t("docs.item.edit", { name: label })}
          title={t("docs.item.edit", { name: label })}
          onClick={() =>
            editor.dispatchCommand(EDIT_GUILD_DOC_ITEM_COMMAND, nodeKey)
          }
        >
          <Pencil className="size-3.5" />
        </Button>
      )}
    </span>
  );
};
