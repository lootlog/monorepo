import { describe, expect, it } from "vitest";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from "lexical";
import { guildDocEditorNodes } from "./guild-doc-editor-nodes";
import { serializeGuildDocEditorState } from "./guild-doc-editor-content";
import {
  $createGuildDocItemNode,
  type GuildDocItem,
} from "./guild-doc-item-node";
import { registerGuildDocItemIdTransform } from "./guild-doc-item-id-plugin";
import { $createGuildDocMemberNode } from "./guild-doc-member-node";

const createDocEditor = () =>
  createEditor({
    nodes: guildDocEditorNodes,
    onError: (error) => {
      throw error;
    },
  });

const serializeParagraph = (text: string) => {
  const editor = createDocEditor();

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

const ITEM: GuildDocItem = {
  snapshot: {
    name: "Barbuta",
    icon: "hel/barbuta.gif",
    stat: "lvl=90;rarity=legendary",
    rarity: "LEGENDARY",
    type: "helmets",
    catalogId: 1234,
  },
  itemId: "ITEM#abc123.luvia",
};

describe("document items and mentions", () => {
  it("load back exactly as they were saved", () => {
    const editor = createDocEditor();

    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createGuildDocItemNode(ITEM),
              $createTextNode(" -> "),
              $createGuildDocMemberNode({ userId: "42", name: "Kobra" }),
            ),
          );
      },
      { discrete: true },
    );

    const saved = serializeGuildDocEditorState(
      editor.getEditorState().toJSON(),
    );

    const reopened = createDocEditor();

    reopened.setEditorState(reopened.parseEditorState(JSON.stringify(saved)));

    expect(
      serializeGuildDocEditorState(reopened.getEditorState().toJSON()),
    ).toEqual(saved);
  });

  it("opens a document whose saved item is malformed", () => {
    const editor = createDocEditor();

    const state = editor.parseEditorState(
      JSON.stringify({
        root: {
          type: "root",
          version: 1,
          children: [
            {
              type: "paragraph",
              version: 1,
              children: [
                { type: "guild-doc-item", version: 1, item: { name: 7 } },
                { type: "guild-doc-member", version: 1 },
              ],
            },
          ],
        },
      }),
    );

    editor.setEditorState(state);

    expect(
      editor.getEditorState().read(() => $getRoot().getTextContent()),
    ).toBe("@");
  });
});

const HID = "c58b884a4fc56dc0621a296aaf24a7286b1dcff3dab1b2e89f1f2559c247a492";

const writeParagraph = (text: string) => {
  const editor = createDocEditor();

  registerGuildDocItemIdTransform(editor);
  editor.update(
    () => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode(text)));
    },
    { discrete: true },
  );

  const saved = serializeGuildDocEditorState(editor.getEditorState().toJSON());

  return JSON.parse(JSON.stringify(saved)).root.children[0].children.map(
    (node: { type: string; text?: string; itemId?: string }) =>
      node.type === "text" ? node.text : node.itemId,
  );
};

describe("item identifiers in the text", () => {
  it("become items, keeping the words around them", () => {
    expect(
      writeParagraph(`Wydano ITEM#${HID}.luvia -> Kobra, ITEM#${HID}.tempest`),
    ).toEqual([
      "Wydano ",
      `ITEM#${HID}.luvia`,
      " -> Kobra, ",
      `ITEM#${HID}.tempest`,
    ]);
  });

  it("replace a link an earlier editor made of the identifier", () => {
    const editor = createDocEditor();

    registerGuildDocItemIdTransform(editor);
    editor.setEditorState(
      editor.parseEditorState(
        JSON.stringify({
          root: {
            type: "root",
            version: 1,
            children: [
              {
                type: "paragraph",
                version: 1,
                children: [
                  {
                    type: "autolink",
                    version: 1,
                    url: `https://ITEM#${HID}.luvia`,
                    children: [
                      { type: "text", version: 1, text: `ITEM#${HID}.luvia` },
                    ],
                  },
                  { type: "text", version: 1, text: " -> Kobra" },
                ],
              },
            ],
          },
        }),
      ),
    );
    editor.update(() => {}, { discrete: true });

    const saved = serializeGuildDocEditorState(
      editor.getEditorState().toJSON(),
    );

    expect(
      JSON.parse(JSON.stringify(saved)).root.children[0].children.map(
        (node: { type: string }) => node.type,
      ),
    ).toEqual(["guild-doc-item", "text"]);
  });

  it("stay text while they are not a full identifier", () => {
    expect(writeParagraph("ITEM#abc.luvia")).toEqual(["ITEM#abc.luvia"]);
  });
});
