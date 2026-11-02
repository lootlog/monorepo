import { textLinkClassName } from "@lootlog/ui/components/text-link";
import { cn } from "cn";
import type { EditorThemeClasses } from "lexical";

export const guildDocEditorTheme: EditorThemeClasses = {
  code: "my-4 block overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs leading-6",
  codeHighlight: {
    attr: "text-cyan-400",
    boolean: "text-amber-400",
    builtin: "text-purple-400",
    comment: "text-muted-foreground",
    function: "text-blue-400",
    keyword: "text-pink-400",
    number: "text-amber-400",
    operator: "text-muted-foreground",
    property: "text-cyan-400",
    punctuation: "text-muted-foreground",
    string: "text-emerald-400",
    tag: "text-red-400",
    variable: "text-orange-400",
  },
  heading: {
    h1: "mb-3 text-2xl font-semibold leading-tight",
    h2: "mb-2 text-xl font-semibold leading-tight",
  },
  hr: "my-4 border-0 border-t border-border",
  link: cn(textLinkClassName, "text-sm"),
  list: {
    checklist: "my-2",
    listitem: "my-1 ml-6",
    listitemChecked:
      "relative my-1 ml-6 list-none text-muted-foreground line-through before:absolute before:-left-6 before:top-0.5 before:size-4 before:rounded before:border before:border-primary before:bg-primary before:content-[''] after:absolute after:-left-[1.18rem] after:top-[0.1rem] after:text-[11px] after:font-bold after:text-primary-foreground after:content-['✓']",
    listitemUnchecked:
      "relative my-1 ml-6 list-none before:absolute before:-left-6 before:top-0.5 before:size-4 before:rounded before:border before:border-border before:bg-background before:content-['']",
    nested: {
      listitem: "list-none",
    },
    olDepth: ["list-decimal", "list-[lower-alpha]", "list-[lower-roman]"],
    ul: "my-2 list-disc",
  },
  paragraph: "m-0 min-h-5 leading-5",
  quote:
    "my-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-muted-foreground",
  // A table may be wider than the reading column: it grows to the page's right
  // edge (the editor is the inline-size container) and then scrolls sideways,
  // so every column keeps a readable width instead of squeezing letters.
  tableScrollableWrapper:
    "my-4 w-[calc(100cqw-1.5rem)] overflow-x-auto overscroll-x-contain sm:w-[calc(100cqw-2rem)]",
  table: "min-w-[min(100%,48rem)] border-collapse",
  // The editor breaks words anywhere, which lets a table squeeze its columns
  // down to single letters; cells wrap between words instead.
  tableCell:
    "min-w-28 border border-border px-3 py-2 text-left align-top [word-break:normal] break-words",
  tableCellHeader: "bg-muted/70 font-semibold",
  text: {
    bold: "font-semibold",
    italic: "italic",
    strikethrough: "line-through",
    underline: "underline underline-offset-4",
  },
};
