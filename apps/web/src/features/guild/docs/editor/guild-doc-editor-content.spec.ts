import { describe, expect, it } from "vitest";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from "lexical";
import { guildDocEditorNodes } from "./guild-doc-editor-nodes";
import { serializeGuildDocEditorState } from "./guild-doc-editor-content";

const serializeParagraph = (text: string) => {
  const editor = createEditor({
    nodes: guildDocEditorNodes,
    onError: (error) => {
      throw error;
    },
  });

  editor.update(
    () => {
      const paragraph = $createParagraphNode();

      paragraph.append($createTextNode(text));
      $getRoot().clear().append(paragraph);
    },
    { discrete: true },
  );

  return editor.getEditorState().toJSON();
};

describe("serializeGuildDocEditorState", () => {
  it("keeps an edit that Lexical serializes with undefined node fields", () => {
    const state = serializeParagraph("hello");

    expect(serializeGuildDocEditorState(state)).toEqual(
      JSON.parse(JSON.stringify(state)),
    );
  });
});
