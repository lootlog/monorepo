import { createLinkMatcherWithRegExp, formatUrl } from "@lexical/link";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { cn } from "cn";
import type { ReactNode } from "react";
import { GuildDocEditorEditablePlugin } from "./guild-doc-editor-editable-plugin";
import { GuildDocCodeHighlightPlugin } from "./guild-doc-code-highlight-plugin";
import { GuildDocItemIdPlugin } from "./guild-doc-item-id-plugin";
import { GuildDocMemberMentionPlugin } from "./guild-doc-member-mention-plugin";
import {
  type GuildDocEditorContent,
  normalizeGuildDocEditorContent,
  serializeGuildDocEditorState,
} from "./guild-doc-editor-content";
import { guildDocEditorNodes } from "./guild-doc-editor-nodes";
import { guildDocEditorTheme } from "./guild-doc-editor-theme";
import { GuildDocEditorToolbar } from "./guild-doc-editor-toolbar";

type GuildDocEditorProps = {
  className?: string;
  contentClassName?: string;
  /** Shown between the toolbar and the text, such as the document's title. */
  header?: ReactNode;
  /** The document's own actions at the end of the toolbar. */
  toolbarActions?: ReactNode;
  content: GuildDocEditorContent;
  editable: boolean;
  namespace: string;
  onChange?: (content: GuildDocEditorContent) => void;
};

// A host never holds `#`, and an item identifier (`ITEM#….luvia`) is not a
// link, however much its ending looks like a domain.
const URL_MATCHER =
  /(?<!ITEM#[\w-]*)((https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~=]{1,256}\.[a-zA-Z0-9()]{1,12}\b[-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const EMAIL_MATCHER = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const AUTO_LINK_MATCHERS = [
  createLinkMatcherWithRegExp(URL_MATCHER, (text) => formatUrl(text)),
  createLinkMatcherWithRegExp(EMAIL_MATCHER, (text) =>
    formatUrl(`mailto:${text}`),
  ),
];

export const GuildDocEditor = ({
  className,
  contentClassName,
  header,
  toolbarActions,
  content,
  editable,
  namespace,
  onChange,
}: GuildDocEditorProps) => {
  const normalizedContent = normalizeGuildDocEditorContent(content);

  return (
    <LexicalComposer
      initialConfig={{
        editable,
        editorState: JSON.stringify(normalizedContent),
        namespace,
        nodes: guildDocEditorNodes,
        onError: (error) => {
          throw error;
        },
        theme: guildDocEditorTheme,
      }}
    >
      <div className={cn("@container flex flex-col", className)}>
        {editable && <GuildDocEditorToolbar actions={toolbarActions} />}
        {header}
        <RichTextPlugin
          contentEditable=<ContentEditable
            className={cn(
              "text-sm outline-none selection:bg-primary/20",
              editable ? "cursor-text" : "cursor-default",
              contentClassName,
            )}
          />
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <AutoLinkPlugin matchers={AUTO_LINK_MATCHERS} />
        <ClickableLinkPlugin newTab disabled={editable} />
        <TablePlugin hasHorizontalScroll />
        <HorizontalRulePlugin />
        <GuildDocCodeHighlightPlugin />
        <TabIndentationPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        {editable && <GuildDocMemberMentionPlugin />}
        {editable && <GuildDocItemIdPlugin />}
        <GuildDocEditorEditablePlugin editable={editable} />
        {onChange && (
          <OnChangePlugin
            ignoreSelectionChange
            onChange={(editorState) => {
              if (!editable) {
                return;
              }

              const nextContent = serializeGuildDocEditorState(
                editorState.toJSON(),
              );

              if (nextContent) {
                onChange(nextContent);
              }
            }}
          />
        )}
      </div>
    </LexicalComposer>
  );
};
