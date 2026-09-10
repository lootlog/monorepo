import { readTemplateEditorState } from "./notification-template-suggestion";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { $getRoot } from "lexical";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { previewMarkdownComponents } from "../utils/notification-rule-form-preview.utils";

import { Button } from "@lootlog/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import {
  createTemplateEditorNodes,
  renderTemplatePreview,
} from "./notification-template-editor.utils";
import { NotificationTemplateRoleNode } from "./notification-template-role-node";
import { NotificationTemplateVariableNode } from "./notification-template-variable-node";

import { useNotificationTemplateEditor } from "./use-notification-template-editor";

export const NotificationTemplateEditor = (
  props: Parameters<typeof useNotificationTemplateEditor>[0],
) => {
  const {
    templatePresets,
    disabled,
    applyPreset,
    value,
    previewButtonClassName,
    setIsPreviewVisible,
    t,
    roles,
    editorSurfaceRef,
    handleEditorKeyDown,
    editorPlaceholder,
    editorRef,
    onChange,
    setActiveSuggestion,
    activeSuggestion,
    filteredSuggestions,
    suggestionItemRefs,
    highlightedSuggestionIndex,
    setHighlightedSuggestion,
    activeSuggestionIdentity,
    insertSuggestion,
    isPreviewVisible,
    previewTemplateValues,
    variableSuggestions,
  } = useNotificationTemplateEditor(props);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {templatePresets.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => applyPreset(preset.value)}
          >
            {preset.label}
          </Button>
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          className={previewButtonClassName}
          onClick={() => setIsPreviewVisible(true)}
        >
          {t("settings.notifications.templateEditor.showPreview")}
        </Button>
      </div>

      <LexicalComposer
        initialConfig={{
          editable: !disabled,
          editorState: () => {
            const root = $getRoot();
            root.clear();
            root.append(...createTemplateEditorNodes(value, roles));
          },
          namespace: "notification-template-editor",
          nodes: [
            NotificationTemplateRoleNode,
            NotificationTemplateVariableNode,
          ],
          onError: (error) => {
            throw error;
          },
        }}
      >
        <div className="overflow-visible rounded-xl border border-border/70 bg-background">
          <div className="border-b border-border/60 bg-muted/20 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("settings.notifications.templateEditor.label")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("settings.notifications.templateEditor.description")}
            </p>
          </div>
          <div
            ref={editorSurfaceRef}
            className="relative min-h-[220px] bg-background"
          >
            <PlainTextPlugin
              contentEditable=<ContentEditable
                className={cn(
                  "relative z-10 min-h-[220px] whitespace-pre-wrap bg-transparent px-4 py-3 text-sm leading-6 outline-none",
                  disabled ? "cursor-not-allowed opacity-70" : "",
                )}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                onKeyDownCapture={handleEditorKeyDown}
                aria-placeholder={editorPlaceholder}
                placeholder={
                  <div className="pointer-events-none absolute left-4 top-3 text-sm text-muted-foreground">
                    {editorPlaceholder}
                  </div>
                }
              />
              placeholder={null}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <EditorRefPlugin editorRef={editorRef} />
            <OnChangePlugin
              onChange={(editorState) => {
                editorState.read(() =>
                  readTemplateEditorState({
                    editorSurface: editorSurfaceRef.current,
                    onChange,
                    setActiveSuggestion,
                  }),
                );
              }}
            />
            {activeSuggestion && filteredSuggestions.length > 0 ? (
              <div
                className="pointer-events-none absolute z-20"
                style={{
                  left: `${Math.max(12, activeSuggestion.left)}px`,
                  top: `${Math.max(12, activeSuggestion.top)}px`,
                  transform:
                    activeSuggestion.top > 160
                      ? "translateY(-100%)"
                      : "translateY(0)",
                }}
              >
                <div className="pointer-events-auto w-[320px] overflow-hidden rounded-xl border border-border/80 bg-popover shadow-xl">
                  <Command>
                    <ScrollArea className="h-64">
                      <CommandList className="h-full max-h-none">
                        <CommandEmpty>
                          {t(
                            "settings.notifications.templateEditor.emptySuggestions",
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredSuggestions.map((suggestion, index) => (
                            <CommandItem
                              ref={(element) => {
                                suggestionItemRefs.current[suggestion.key] =
                                  element;
                              }}
                              key={suggestion.key}
                              value={suggestion.label}
                              className={cn(
                                highlightedSuggestionIndex === index &&
                                  "bg-accent text-accent-foreground",
                              )}
                              onMouseEnter={() => {
                                setHighlightedSuggestion({
                                  identity: activeSuggestionIdentity,
                                  index,
                                });
                              }}
                              onSelect={() =>
                                insertSuggestion(
                                  suggestion,
                                  activeSuggestion.replaceLength,
                                )
                              }
                            >
                              <span className="font-medium">
                                {suggestion.label}
                              </span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {suggestion.snippet}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </ScrollArea>
                  </Command>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </LexicalComposer>

      <Dialog open={isPreviewVisible} onOpenChange={setIsPreviewVisible}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t("settings.notifications.templateEditor.previewLabel")}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {t("settings.notifications.templateEditor.previewDescription")}
            </p>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("settings.notifications.templateEditor.previewNotice")}
            </p>
            <div className="py-3 text-sm">
              <div className="max-w-none whitespace-pre-wrap break-words text-foreground [&_blockquote]:rounded-md [&_blockquote]:border [&_blockquote]:border-border [&_blockquote]:px-3 [&_blockquote]:py-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_hr]:border-border [&_li]:ml-4 [&_p]:leading-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_strong]:font-semibold">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={previewMarkdownComponents}
                >
                  {renderTemplatePreview(value, previewTemplateValues)}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="py-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t("settings.notifications.templateEditor.availableVariables")}
        </p>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          {variableSuggestions
            .map((suggestion) => suggestion.snippet)
            .join(",")}
        </p>
      </div>
    </div>
  );
};
