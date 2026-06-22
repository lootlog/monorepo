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
import { cn } from "@lootlog/ui/lib/utils";
import { GuildDocEditorEditablePlugin } from "./guild-doc-editor-editable-plugin";
import { GuildDocCodeHighlightPlugin } from "./guild-doc-code-highlight-plugin";
import {
  type GuildDocEditorContent,
  normalizeGuildDocEditorContent,
} from "./guild-doc-editor-content";
import { guildDocEditorNodes } from "./guild-doc-editor-nodes";
import { guildDocEditorTheme } from "./guild-doc-editor-theme";
import { GuildDocEditorToolbar } from "./guild-doc-editor-toolbar";

type GuildDocEditorProps = {
  className?: string;
  content: GuildDocEditorContent;
  editable: boolean;
  namespace: string;
  onChange?: (content: GuildDocEditorContent) => void;
};

const URL_MATCHER =
  /((https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,12}\b[-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
const EMAIL_MATCHER = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const AUTO_LINK_MATCHERS = [
  createLinkMatcherWithRegExp(URL_MATCHER, (text) => formatUrl(text)),
  createLinkMatcherWithRegExp(EMAIL_MATCHER, (text) =>
    formatUrl(`mailto:${text}`),
  ),
];

export const GuildDocEditor = ({
  className,
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
      <div
        className={cn(
          "flex min-h-[420px] flex-col overflow-hidden rounded-md border border-border bg-background",
          className,
        )}
      >
        {editable && <GuildDocEditorToolbar />}
        <div className="relative min-h-[420px] flex-1">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  "absolute inset-0 overflow-auto px-4 py-4 text-sm outline-none",
                  "selection:bg-primary/20",
                  editable ? "cursor-text" : "cursor-default",
                )}
              />
            }
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <CheckListPlugin />
          <LinkPlugin />
          <AutoLinkPlugin matchers={AUTO_LINK_MATCHERS} />
          <ClickableLinkPlugin newTab disabled={editable} />
          <TablePlugin />
          <HorizontalRulePlugin />
          <GuildDocCodeHighlightPlugin />
          <TabIndentationPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <GuildDocEditorEditablePlugin editable={editable} />
          {onChange && (
            <OnChangePlugin
              ignoreSelectionChange
              onChange={(editorState) => {
                if (!editable) {
                  return;
                }

                onChange(
                  editorState.toJSON() as unknown as GuildDocEditorContent,
                );
              }}
            />
          )}
        </div>
      </div>
    </LexicalComposer>
  );
};
