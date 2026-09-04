import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type BaseSelection,
  type LexicalNode,
  type TextFormatType,
} from "lexical";
import { useEffect, useState } from "react";
import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $setBlocksType } from "@lexical/selection";
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import {
  $createLinkNode,
  $isLinkNode,
  $toggleLink,
  formatUrl,
} from "@lexical/link";
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getTableCellNodeFromLexicalNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableSelection,
  INSERT_TABLE_COMMAND,
  type InsertTableCommandPayload,
} from "@lexical/table";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  Bold,
  Code2,
  Columns3,
  Heading1,
  Heading2,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Rows3,
  Strikethrough,
  Table2,
  TableColumnsSplit,
  TableRowsSplit,
  Type,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Separator } from "@lootlog/ui/components/separator";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { GuildDocLinkDialog } from "./guild-doc-link-dialog";
import { GuildDocTableDialog } from "./guild-doc-table-dialog";

type ActiveBlock =
  | "paragraph"
  | "h1"
  | "h2"
  | "quote"
  | "bullet"
  | "number"
  | "check"
  | "code";

type ToolbarActiveState = {
  block: ActiveBlock;
  bold: boolean;
  italic: boolean;
  link: boolean;
  strike: boolean;
  table: boolean;
  underline: boolean;
};

type ToolbarControl = {
  action: () => void;
  active?: boolean;
  icon: LucideIcon;
  label: string;
};

type ToolbarItem = ToolbarControl | "separator";

const initialActiveState: ToolbarActiveState = {
  block: "paragraph",
  bold: false,
  italic: false,
  link: false,
  strike: false,
  table: false,
  underline: false,
};

const resettableTextFormats: TextFormatType[] = [
  "bold",
  "code",
  "italic",
  "strikethrough",
  "underline",
];

const getActiveBlock = (node: LexicalNode): ActiveBlock => {
  let currentNode: LexicalNode | null = node;

  while (currentNode) {
    if ($isCodeNode(currentNode)) {
      return "code";
    }

    if ($isListNode(currentNode)) {
      const listType = currentNode.getListType();

      if (listType === "number") {
        return "number";
      }

      if (listType === "check") {
        return "check";
      }

      return "bullet";
    }

    if ($isHeadingNode(currentNode)) {
      const tag = currentNode.getTag();

      if (tag === "h1" || tag === "h2") {
        return tag;
      }

      return "paragraph";
    }

    if ($isQuoteNode(currentNode)) {
      return "quote";
    }

    currentNode = currentNode.getParent();
  }

  return "paragraph";
};

const getIsLinkActive = (node: LexicalNode) => {
  let currentNode: LexicalNode | null = node;

  while (currentNode) {
    if ($isLinkNode(currentNode)) {
      return true;
    }

    currentNode = currentNode.getParent();
  }

  return false;
};

const getIsTableActive = (selection: BaseSelection) => {
  if ($isTableSelection(selection)) {
    return true;
  }

  if (!$isRangeSelection(selection)) {
    return false;
  }

  return selection
    .getNodes()
    .some((node) => $getTableCellNodeFromLexicalNode(node) !== null);
};

export const GuildDocEditorToolbar = () => {
  const [editor] = useLexicalComposerContext();
  const { t } = useTranslation();
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [savedSelection, setSavedSelection] = useState<BaseSelection | null>(
    null,
  );
  const [selectedLinkText, setSelectedLinkText] = useState("");
  const [activeState, setActiveState] =
    useState<ToolbarActiveState>(initialActiveState);

  useEffect(() => {
    const readActiveState = () => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        setActiveState({
          ...initialActiveState,
          table: selection ? getIsTableActive(selection) : false,
        });
        return;
      }

      const anchorNode = selection.anchor.getNode();
      const focusNode = selection.focus.getNode();
      let selectedNode = anchorNode;

      if (
        anchorNode.getKey() !== focusNode.getKey() &&
        selection.isBackward()
      ) {
        selectedNode = focusNode;
      }

      setActiveState({
        block: getActiveBlock(selectedNode),
        bold: selection.hasFormat("bold"),
        italic: selection.hasFormat("italic"),
        link: getIsLinkActive(selectedNode),
        strike: selection.hasFormat("strikethrough"),
        table: getIsTableActive(selection),
        underline: selection.hasFormat("underline"),
      });
    };

    editor.getEditorState().read(readActiveState);

    const unregisterUpdateListener = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(readActiveState);
      },
    );
    const unregisterSelectionListener = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        readActiveState();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      unregisterUpdateListener();
      unregisterSelectionListener();
    };
  }, [editor]);

  const updateBlock = (type: "paragraph" | "h1" | "h2" | "quote" | "code") => {
    editor.update(() => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return;
      }

      if (type === "paragraph") {
        $setBlocksType(selection, () => $createParagraphNode());
        return;
      }

      if (type === "quote") {
        $setBlocksType(selection, () => $createQuoteNode());
        return;
      }

      if (type === "code") {
        $setBlocksType(selection, () => $createCodeNode());
        return;
      }

      $setBlocksType(selection, () => $createHeadingNode(type));
    });
  };

  const openLinkDialog = () => {
    let nextSelection: BaseSelection | null = null;
    let nextSelectedText = "";

    editor.getEditorState().read(() => {
      const selection = $getSelection();

      nextSelection = selection?.clone() ?? null;

      if ($isRangeSelection(selection)) {
        nextSelectedText = selection.getTextContent();
      }
    });

    setSavedSelection(nextSelection);
    setSelectedLinkText(nextSelectedText);
    setLinkDialogOpen(true);
  };

  const submitLink = (data: { text: string; url: string }) => {
    const normalizedUrl = formatUrl(data.url);

    editor.update(() => {
      if (savedSelection) {
        $setSelection(savedSelection.clone());
      }

      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return;
      }

      if (selection.isCollapsed()) {
        const linkNode = $createLinkNode(normalizedUrl, {
          rel: "noreferrer",
          target: "_blank",
        });

        linkNode.append($createTextNode(data.text || normalizedUrl));
        selection.insertNodes([linkNode]);
        return;
      }

      $toggleLink(normalizedUrl, {
        rel: "noreferrer",
        target: "_blank",
      });
    });

    setLinkDialogOpen(false);
    setSavedSelection(null);
    window.requestAnimationFrame(() => editor.focus());
  };

  const handleLinkDialogOpenChange = (open: boolean) => {
    setLinkDialogOpen(open);

    if (!open) {
      setSavedSelection(null);
    }
  };

  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return;
      }

      resettableTextFormats.forEach((format) => {
        if (selection.hasFormat(format)) {
          selection.formatText(format);
        }
      });

      $toggleLink(null);
      $setBlocksType(selection, () => $createParagraphNode());
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left");
    });
  };

  const insertTable = (payload: InsertTableCommandPayload) => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, payload);
  };

  const tableControls: ToolbarControl[] = activeState.table
    ? [
        {
          label: t("docs.toolbar.insertTableRow"),
          icon: TableRowsSplit,
          action: () => editor.update(() => $insertTableRowAtSelection(true)),
        },
        {
          label: t("docs.toolbar.insertTableColumn"),
          icon: TableColumnsSplit,
          action: () =>
            editor.update(() => $insertTableColumnAtSelection(true)),
        },
        {
          label: t("docs.toolbar.deleteTableRow"),
          icon: Rows3,
          action: () => editor.update(() => $deleteTableRowAtSelection()),
        },
        {
          label: t("docs.toolbar.deleteTableColumn"),
          icon: Columns3,
          action: () => editor.update(() => $deleteTableColumnAtSelection()),
        },
      ]
    : [];

  const textControls: ToolbarControl[] = [
    {
      label: t("docs.toolbar.bold"),
      icon: Bold,
      active: activeState.bold,
      action: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"),
    },
    {
      label: t("docs.toolbar.italic"),
      icon: Italic,
      active: activeState.italic,
      action: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"),
    },
    {
      label: t("docs.toolbar.underline"),
      icon: Underline,
      active: activeState.underline,
      action: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline"),
    },
    {
      label: t("docs.toolbar.strike"),
      icon: Strikethrough,
      active: activeState.strike,
      action: () =>
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough"),
    },
  ];

  const blockControls: ToolbarControl[] = [
    {
      label: t("docs.toolbar.paragraph"),
      icon: Type,
      active: activeState.block === "paragraph",
      action: () => updateBlock("paragraph"),
    },
    {
      label: t("docs.toolbar.heading1"),
      icon: Heading1,
      active: activeState.block === "h1",
      action: () => updateBlock("h1"),
    },
    {
      label: t("docs.toolbar.heading2"),
      icon: Heading2,
      active: activeState.block === "h2",
      action: () => updateBlock("h2"),
    },
    {
      label: t("docs.toolbar.quote"),
      icon: Quote,
      active: activeState.block === "quote",
      action: () => updateBlock("quote"),
    },
    {
      label: t("docs.toolbar.codeBlock"),
      icon: Code2,
      active: activeState.block === "code",
      action: () => updateBlock("code"),
    },
  ];

  const insertControls: ToolbarControl[] = [
    {
      label: t("docs.toolbar.bullets"),
      icon: List,
      active: activeState.block === "bullet",
      action: () =>
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
    },
    {
      label: t("docs.toolbar.numbers"),
      icon: ListOrdered,
      active: activeState.block === "number",
      action: () =>
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
    },
    {
      label: t("docs.toolbar.checklist"),
      icon: ListChecks,
      active: activeState.block === "check",
      action: () =>
        editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
    },
    {
      label: t("docs.toolbar.link"),
      icon: Link,
      active: activeState.link,
      action: openLinkDialog,
    },
    {
      label: t("docs.toolbar.horizontalRule"),
      icon: Minus,
      action: () =>
        editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
    },
    {
      label: t("docs.toolbar.table"),
      icon: Table2,
      action: () => setTableDialogOpen(true),
    },
  ];

  const utilityControls: ToolbarControl[] = [
    {
      label: t("docs.toolbar.outdent"),
      icon: IndentDecrease,
      action: () => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined),
    },
    {
      label: t("docs.toolbar.indent"),
      icon: IndentIncrease,
      action: () => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined),
    },
    {
      label: t("docs.toolbar.clearFormatting"),
      icon: RemoveFormatting,
      action: clearFormatting,
    },
  ];

  const controls: ToolbarItem[] = [
    {
      label: t("docs.toolbar.undo"),
      icon: Undo2,
      action: () => editor.dispatchCommand(UNDO_COMMAND, undefined),
    },
    {
      label: t("docs.toolbar.redo"),
      icon: Redo2,
      action: () => editor.dispatchCommand(REDO_COMMAND, undefined),
    },
    "separator",
    ...textControls,
    "separator",
    ...blockControls,
    "separator",
    ...insertControls,
    "separator",
    ...utilityControls,
    ...(tableControls.length > 0
      ? (["separator", ...tableControls] as const)
      : []),
  ];

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2">
        {controls.map((control, index) => {
          if (control === "separator") {
            return (
              <Separator
                key={`separator-${index}`}
                orientation="vertical"
                className="mx-1 h-6"
              />
            );
          }

          const Icon = control.icon;
          const isActive = control.active === true;

          return (
            <Tooltip key={control.label}>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "relative h-8 w-8 border border-transparent text-muted-foreground transition-colors",
                      "hover:bg-muted hover:text-foreground",
                      isActive &&
                        "border-primary/70 bg-primary/25 text-primary shadow-sm ring-1 ring-primary/30 hover:bg-primary/30 hover:text-primary after:absolute after:bottom-1 after:left-1/2 after:h-0.5 after:w-4 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                    )}
                    aria-label={control.label}
                    aria-pressed={
                      control.active === undefined ? undefined : control.active
                    }
                    onClick={control.action}
                  >
                    <Icon className="size-4" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">
                <p>{control.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <GuildDocTableDialog
        open={tableDialogOpen}
        onInsert={insertTable}
        onOpenChange={setTableDialogOpen}
      />
      <GuildDocLinkDialog
        open={linkDialogOpen}
        selectedText={selectedLinkText}
        onOpenChange={handleLinkDialogOpenChange}
        onSubmit={submitLink}
      />
    </>
  );
};
