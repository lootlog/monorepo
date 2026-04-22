import {
  getChatEditorSelectionOffsets,
  normalizeChatEditorText,
  restoreChatEditorSelection,
} from "@/features/chat/chat-editor-selection.helpers";
import { describe, expect, it } from "vitest";

describe("chat-editor-selection.helpers", () => {
  it("normalizes line breaks and non-breaking spaces", () => {
    expect(normalizeChatEditorText("a\u00a0b\nc")).toBe("a b c");
  });

  it("restores selection offsets inside nested mention markup", () => {
    const root = document.createElement("div");
    const prefixNode = document.createTextNode("hej ");
    const mentionNode = document.createElement("span");
    mentionNode.textContent = "@Raider";
    const suffixNode = document.createTextNode(" test");

    root.append(prefixNode, mentionNode, suffixNode);
    document.body.append(root);

    restoreChatEditorSelection({
      root,
      start: 5,
      end: 12,
    });

    expect(getChatEditorSelectionOffsets(root)).toEqual({
      start: 5,
      end: 12,
    });
  });
});
