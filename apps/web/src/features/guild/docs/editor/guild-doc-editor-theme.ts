import type { EditorThemeClasses } from "lexical";

export const guildDocEditorTheme: EditorThemeClasses = {
  code: "my-4 block overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs leading-6",
  codeHighlight: {
    attr: "text-cyan-600",
    boolean: "text-amber-600",
    builtin: "text-purple-600",
    comment: "text-muted-foreground",
    function: "text-blue-600",
    keyword: "text-pink-600",
    number: "text-amber-600",
    operator: "text-muted-foreground",
    property: "text-cyan-600",
    punctuation: "text-muted-foreground",
    string: "text-emerald-600",
    tag: "text-red-600",
    variable: "text-orange-600",
  },
  heading: {
    h1: "mb-3 text-2xl font-semibold leading-tight",
    h2: "mb-2 text-xl font-semibold leading-tight",
  },
  hr: "my-4 border-0 border-t border-border",
  link: "cursor-pointer text-primary underline underline-offset-4",
  list: {
    checklist: "my-2",
    listitem: "my-1 ml-6",
    listitemChecked:
      "relative my-1 ml-6 list-none text-muted-foreground line-through before:absolute before:-left-6 before:top-0.5 before:size-4 before:rounded before:border before:border-primary before:bg-primary before:content-[''] after:absolute after:-left-[1.15rem] after:top-[0.42rem] after:h-1.5 after:w-2.5 after:-rotate-45 after:border-b-2 after:border-l-2 after:border-primary-foreground after:content-['']",
    listitemUnchecked:
      "relative my-1 ml-6 list-none before:absolute before:-left-6 before:top-0.5 before:size-4 before:rounded before:border before:border-border before:bg-background before:content-['']",
    nested: {
      listitem: "list-none",
    },
    olDepth: ["list-decimal", "list-[lower-alpha]", "list-[lower-roman]"],
    ul: "my-2 list-disc",
  },
  paragraph: "m-0 min-h-5 leading-5",
  quote: "my-3 border-l-2 border-primary/50 pl-4 text-muted-foreground",
  table:
    "my-4 w-full table-fixed border-collapse overflow-hidden rounded-md border border-border",
  tableCell: "border border-border px-3 py-2 align-top",
  tableCellHeader:
    "border border-border bg-muted/70 px-3 py-2 text-left font-semibold",
  text: {
    bold: "font-semibold",
    italic: "italic",
    strikethrough: "line-through",
    underline: "underline underline-offset-4",
  },
};
