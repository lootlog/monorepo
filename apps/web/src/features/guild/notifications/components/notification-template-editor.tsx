import { readTemplateEditorState } from "./notification-template-suggestion";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { $getRoot } from "lexical";

import { Button } from "@lootlog/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { createTemplateEditorNodes } from "./notification-template-editor.utils";
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
    previewTemplateValues,
    variableSuggestions,
  } = useNotificationTemplateEditor(props);

  const previewValueByKey = new Map(Object.entries(previewTemplateValues));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {templatePresets.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => applyPreset(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
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
          {/* Variables go in at the caret; the button keeps the editor's selection. */}
          <div
            role="toolbar"
            aria-label={t(
              "settings.notifications.templateEditor.insertVariable",
            )}
            className="flex flex-wrap items-center gap-1.5 rounded-t-xl border-b border-border/60 bg-muted/20 px-3 py-2"
          >
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              {t("settings.notifications.templateEditor.insertVariable")}
            </span>
            {variableSuggestions.map((suggestion) => (
              <Tooltip key={suggestion.key}>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={disabled}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertSuggestion(suggestion)}
                    >
                      {suggestion.label}
                    </Button>
                  }
                />
                <TooltipContent>
                  <p className="font-mono">{suggestion.snippet}</p>
                  <p className="text-muted-foreground">
                    {t(
                      "settings.notifications.templateEditor.variableExample",
                      {
                        value: previewValueByKey.get(suggestion.templateKey),
                      },
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <div
            ref={editorSurfaceRef}
            className="relative min-h-[220px] rounded-b-xl bg-background"
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

      <p className="text-xs text-muted-foreground">
        {t("settings.notifications.templateEditor.hint", {
          variable: "{{",
          mention: "@",
        })}
      </p>
    </div>
  );
};
