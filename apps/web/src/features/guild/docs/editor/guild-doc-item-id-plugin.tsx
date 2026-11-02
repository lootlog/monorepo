import { findItemHidInText, formatItemHid } from "@/lib/utils/hid-detection";
import { $isLinkNode } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TextNode, type LexicalEditor } from "lexical";
import { useEffect } from "react";
import { $createGuildDocItemNode } from "./guild-doc-item-node";

/**
 * Turns an `ITEM#…` identifier written or pasted into the text into an item,
 * which then finds itself among the Organization's loots. Older documents
 * convert when a writer opens them, including identifiers an earlier editor
 * wrongly turned into links.
 */
export const registerGuildDocItemIdTransform = (editor: LexicalEditor) =>
  editor.registerNodeTransform(TextNode, (node) => {
    // Code blocks and formatted tokens keep their text as written.
    if (!node.isSimpleText()) {
      return;
    }

    const text = node.getTextContent();
    const match = findItemHidInText(text);

    if (!match) {
      return;
    }

    const itemNode = $createGuildDocItemNode({
      snapshot: null,
      itemId: formatItemHid(match.hid, match.world),
    });

    const parent = node.getParent();

    if ($isLinkNode(parent)) {
      // A link that is nothing but the identifier becomes the item; one with
      // its own words stays a link.
      if (
        parent.getTextContent() === text &&
        match.start === 0 &&
        match.end === text.length
      ) {
        parent.replace(itemNode);
      }

      return;
    }

    const offsets = [match.start, match.end].filter(
      (offset) => offset > 0 && offset < text.length,
    );

    const parts = node.splitText(...offsets);
    const target = parts[match.start > 0 ? 1 : 0];

    // The text after the identifier is a new node, transformed in turn.
    target?.replace(itemNode);
  });

export const GuildDocItemIdPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => registerGuildDocItemIdTransform(editor), [editor]);

  return null;
};
