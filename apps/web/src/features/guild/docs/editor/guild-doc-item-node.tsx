import type { LootItemResponseDto } from "@lootlog/client/main";
import {
  $applyNodeReplacement,
  createCommand,
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { ReactNode } from "react";
import { Option, Schema } from "effect";
import { GuildDocItemChip } from "./guild-doc-item-chip";

/**
 * A copy of the catalog entry, so the text reads the same after the game
 * changes the item.
 */
const GuildDocItemSnapshotSchema = Schema.Struct({
  name: Schema.String,
  icon: Schema.String,
  stat: Schema.String,
  rarity: Schema.NullOr(Schema.String),
  type: Schema.NullOr(Schema.String),
  catalogId: Schema.NullOr(Schema.Finite),
});

export type GuildDocItemSnapshot = typeof GuildDocItemSnapshotSchema.Type;

const decodeGuildDocItemSnapshot = Schema.decodeUnknownOption(
  GuildDocItemSnapshotSchema,
);

const decodeItemId = Schema.decodeUnknownOption(Schema.String);

/**
 * An item in a document. A pasted in-game identifier alone is enough to start
 * with: the item fills in when one of the Organization's loots recorded it, or
 * when a writer picks it.
 */
export type GuildDocItem = {
  snapshot: GuildDocItemSnapshot | null;
  /** `ITEM#<hid>.<world>`, as players paste it into the game. */
  itemId: string | null;
};

type SerializedGuildDocItemNode = Spread<
  { item: GuildDocItemSnapshot | null; itemId: string | null },
  SerializedLexicalNode
>;

const GUILD_DOC_ITEM_NODE_TYPE = "guild-doc-item";

/** Opens the item dialog for the item node with this key. */
export const EDIT_GUILD_DOC_ITEM_COMMAND = createCommand<NodeKey>(
  "EDIT_GUILD_DOC_ITEM_COMMAND",
);

export const lootItemToGuildDocSnapshot = (
  item: LootItemResponseDto,
): GuildDocItemSnapshot => ({
  name: item.name,
  icon: item.icon,
  stat: item.stat,
  rarity: item.rarity,
  type: item.type,
  catalogId: item.id,
});

/** An item inline in the text or a table cell, with its tooltip. */
export class GuildDocItemNode extends DecoratorNode<ReactNode> {
  __item: GuildDocItem;

  static getType() {
    return GUILD_DOC_ITEM_NODE_TYPE;
  }

  static clone(node: GuildDocItemNode) {
    return new GuildDocItemNode(node.__item, node.__key);
  }

  static importJSON(serializedNode: SerializedGuildDocItemNode) {
    // A saved entry this version cannot read shows as an unknown item.
    return $createGuildDocItemNode({
      snapshot: Option.getOrNull(
        decodeGuildDocItemSnapshot(serializedNode.item),
      ),
      itemId: Option.getOrNull(decodeItemId(serializedNode.itemId)),
    }).updateFromJSON(serializedNode);
  }

  constructor(item: GuildDocItem, key?: NodeKey) {
    super(key);
    this.__item = item;
  }

  exportJSON(): SerializedGuildDocItemNode {
    const { snapshot, itemId } = this.getLatest().__item;

    return { ...super.exportJSON(), item: snapshot, itemId };
  }

  createDOM() {
    const element = document.createElement("span");
    element.className = "inline-block align-middle";

    return element;
  }

  updateDOM() {
    return false;
  }

  getItem() {
    return this.getLatest().__item;
  }

  setItem(item: GuildDocItem) {
    this.getWritable().__item = item;

    return this;
  }

  getTextContent() {
    const { snapshot, itemId } = this.getLatest().__item;

    return snapshot?.name ?? itemId ?? "";
  }

  isInline() {
    return true;
  }

  decorate() {
    return <GuildDocItemChip item={this.__item} nodeKey={this.__key} />;
  }
}

export const $createGuildDocItemNode = (item: GuildDocItem) =>
  $applyNodeReplacement(new GuildDocItemNode(item));

export const $isGuildDocItemNode = (
  node: LexicalNode | null | undefined,
): node is GuildDocItemNode => node instanceof GuildDocItemNode;
