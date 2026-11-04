import {
  $applyNodeReplacement,
  DecoratorNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { ReactNode } from "react";
import { Option, Schema } from "effect";
import { GuildDocMemberChip } from "./guild-doc-member-chip";

const GuildDocMemberSchema = Schema.Struct({
  /** The member's `userId` from member references; it outlives renames. */
  userId: Schema.String,
  /** The name when it was mentioned, shown if the member is gone. */
  name: Schema.String,
});

export type GuildDocMember = typeof GuildDocMemberSchema.Type;

const decodeGuildDocMember = Schema.decodeUnknownOption(GuildDocMemberSchema);

const UNKNOWN_MEMBER: GuildDocMember = { userId: "", name: "" };

type SerializedGuildDocMemberNode = Spread<
  { member: GuildDocMember },
  SerializedLexicalNode
>;

const GUILD_DOC_MEMBER_NODE_TYPE = "guild-doc-member";

/** A member mentioned in the text, shown with their current name and avatar. */
export class GuildDocMemberNode extends DecoratorNode<ReactNode> {
  __member: GuildDocMember;

  static getType() {
    return GUILD_DOC_MEMBER_NODE_TYPE;
  }

  static clone(node: GuildDocMemberNode) {
    return new GuildDocMemberNode(node.__member, node.__key);
  }

  static importJSON(serializedNode: SerializedGuildDocMemberNode) {
    return $createGuildDocMemberNode(
      Option.getOrElse(
        decodeGuildDocMember(serializedNode.member),
        () => UNKNOWN_MEMBER,
      ),
    ).updateFromJSON(serializedNode);
  }

  constructor(member: GuildDocMember, key?: NodeKey) {
    super(key);
    this.__member = member;
  }

  exportJSON(): SerializedGuildDocMemberNode {
    return { ...super.exportJSON(), member: this.getLatest().__member };
  }

  createDOM() {
    const element = document.createElement("span");
    element.className = "inline-block align-middle";

    return element;
  }

  updateDOM() {
    return false;
  }

  getTextContent() {
    return `@${this.getLatest().__member.name}`;
  }

  isInline() {
    return true;
  }

  decorate() {
    return <GuildDocMemberChip member={this.__member} />;
  }
}

export const $createGuildDocMemberNode = (member: GuildDocMember) =>
  $applyNodeReplacement(new GuildDocMemberNode(member));
