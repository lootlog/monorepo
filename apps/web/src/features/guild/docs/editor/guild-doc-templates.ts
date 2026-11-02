import { $createListItemNode, $createListNode } from "@lexical/list";
import { $createHeadingNode } from "@lexical/rich-text";
import {
  $createTableNodeWithDimensions,
  $isTableCellNode,
  $isTableRowNode,
  type TableNode,
} from "@lexical/table";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalNode,
} from "lexical";
import type { TFunction } from "i18next";

type GuildDocTemplateId = "itemLog" | "itemDeposit" | "rules";

export const GUILD_DOC_TEMPLATE_IDS: GuildDocTemplateId[] = [
  "itemLog",
  "itemDeposit",
  "rules",
];

/** Empty rows a template table starts with, below its header row. */
const TEMPLATE_TABLE_ROWS = 3;

const $createHeaderTable = (headers: string[]): TableNode => {
  const table = $createTableNodeWithDimensions(
    TEMPLATE_TABLE_ROWS + 1,
    headers.length,
    { rows: true, columns: false },
  );

  const headerRow = table.getFirstChild();

  if ($isTableRowNode(headerRow)) {
    headerRow.getChildren().forEach((cell, index) => {
      const text = $isTableCellNode(cell) ? cell.getFirstDescendant() : null;

      if ($isTextNode(text)) {
        text.setTextContent(headers[index] ?? "");
      }
    });
  }

  return table;
};

const $createHeading = (text: string) =>
  $createHeadingNode("h2").append($createTextNode(text));

const $createParagraph = (text: string) =>
  $createParagraphNode().append($createTextNode(text));

const buildTemplate = (id: GuildDocTemplateId, t: TFunction): LexicalNode[] => {
  const prefix = `docs.templates.${id}` as const;

  switch (id) {
    case "itemLog":
      return [
        $createHeading(t(`${prefix}.heading`)),
        $createParagraph(t(`${prefix}.hint`)),
        $createHeaderTable([
          t("docs.templates.columns.item"),
          t("docs.templates.columns.receivedBy"),
          t("docs.templates.columns.date"),
          t("docs.templates.columns.notes"),
        ]),
      ];
    case "itemDeposit":
      return [
        $createHeading(t(`${prefix}.heading`)),
        $createParagraph(t(`${prefix}.hint`)),
        $createHeaderTable([
          t("docs.templates.columns.item"),
          t("docs.templates.columns.givenBy"),
          t("docs.templates.columns.receivedBy"),
          t("docs.templates.columns.returnedBy"),
          t("docs.templates.columns.notes"),
        ]),
      ];
    case "rules":
      return [
        $createHeading(t(`${prefix}.heading`)),
        $createListNode("number").append(
          $createListItemNode().append(
            $createTextNode(t(`${prefix}.firstRule`)),
          ),
        ),
        $createHeading(t(`${prefix}.penaltiesHeading`)),
        $createListNode("bullet").append(
          $createListItemNode().append(
            $createTextNode(t(`${prefix}.firstPenalty`)),
          ),
        ),
      ];
  }
};

/**
 * Inserts a template as top-level blocks after the block with the cursor,
 * in place of it when that block is an empty paragraph, or at the end of the
 * document when it has no cursor. An empty paragraph follows to keep writing.
 */
export const $insertGuildDocTemplate = (
  id: GuildDocTemplateId,
  t: TFunction,
) => {
  const trailingParagraph = $createParagraphNode();
  const nodes = [...buildTemplate(id, t), trailingParagraph];
  const selection = $getSelection();

  const currentBlock = $isRangeSelection(selection)
    ? selection.anchor.getNode().getTopLevelElement()
    : null;

  if (currentBlock) {
    nodes.reduce<LexicalNode>(
      (previous, node) => previous.insertAfter(node),
      currentBlock,
    );

    if ($isParagraphNode(currentBlock) && currentBlock.isEmpty()) {
      currentBlock.remove();
    }
  } else {
    $getRoot().append(...nodes);
  }

  trailingParagraph.selectStart();
};
