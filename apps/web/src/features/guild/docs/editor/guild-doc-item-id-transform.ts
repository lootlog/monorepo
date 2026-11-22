import { findItemHidInText, formatItemHid } from "@/lib/utils/hid-detection";
import { $isLinkNode } from "@lexical/link";
import { TextNode, type LexicalEditor } from "lexical";
import { $createGuildDocItemNode } from "./guild-doc-item-node";

export const registerGuildDocItemIdTransform = (editor: LexicalEditor) =>
  editor.registerNodeTransform(TextNode, (node) => {
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

    target?.replace(itemNode);
  });
