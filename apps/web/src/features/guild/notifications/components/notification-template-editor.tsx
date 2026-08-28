import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_BACKSPACE_COMMAND,
  type LexicalEditor,
} from "lexical";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { CreateNotificationRuleDtoTriggerType as NotificationTriggerType } from "@lootlog/api-client/models/main/create-notification-rule-dto-trigger-type";
import type { CreateNotificationRuleDtoTriggerType } from "@lootlog/api-client/models/main/create-notification-rule-dto-trigger-type";
import type { RoleResponseDtoOutput as GuildRole } from "@lootlog/api-client/models/main/role-response-dto-output";
import {
  TIMER_PRESET_SIMPLE,
  TIMER_PRESET_DETAILED,
  TIMER_PRESET_MINIMAL,
  SCHEDULED_PRESET_SIMPLE,
  SCHEDULED_PRESET_MINIMAL,
} from "../utils/notification-settings.utils";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";
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
import { cn } from "@lootlog/ui/lib/utils";
import {
  $createNotificationTemplateRoleNode,
  NotificationTemplateRoleNode,
} from "./notification-template-role-node";
import {
  $createNotificationTemplateVariableNode,
  NotificationTemplateVariableNode,
} from "./notification-template-variable-node";
import {
  createPreviewTemplateValues,
  renderTemplatePreview,
  createTemplateEditorNodes,
  serializeTemplateEditorValue,
  getBackspaceTemplateTokenNode,
  removeTemplateTokenNode,
  SCHEDULED_MESSAGE_VARIABLE_KEYS,
} from "./notification-template-editor.utils";

type NotificationTemplateEditorProps = {
  value: string;
  roles: GuildRole[];
  triggerType?: CreateNotificationRuleDtoTriggerType;
  disabled?: boolean;
  previewButtonClassName?: string;
  onChange: (value: string) => void;
};

type MentionSuggestion = {
  key: string;
  label: string;
  role?: GuildRole;
  snippet: string;
  type: "mention";
};

type VariableSuggestion = {
  key: string;
  label: string;
  snippet: string;
  templateKey: string;
  type: "variable";
};

type TemplateSuggestion = MentionSuggestion | VariableSuggestion;

const getFilteredSuggestions = (
  activeSuggestion: ActiveSuggestion,
  mentionSuggestions: MentionSuggestion[],
  variableSuggestions: VariableSuggestion[],
): TemplateSuggestion[] => {
  if (activeSuggestion?.type === "mention") {
    return mentionSuggestions
      .filter((suggestion) =>
        suggestion.label
          .toLocaleLowerCase("pl")
          .includes(activeSuggestion.query.toLocaleLowerCase("pl")),
      )
      .slice(0, 8);
  }

  if (activeSuggestion?.type === "variable") {
    return variableSuggestions.filter((suggestion) =>
      suggestion.key
        .toLocaleLowerCase("pl")
        .includes(activeSuggestion.query.toLocaleLowerCase("pl")),
    );
  }

  return [];
};

type ActiveSuggestion =
  | {
      left: number;
      query: string;
      replaceLength: number;
      top: number;
      type: "mention";
    }
  | {
      left: number;
      query: string;
      replaceLength: number;
      top: number;
      type: "variable";
    }
  | null;

type SuggestionPosition = {
  bottom: number;
  left: number;
  top: number;
};

const getSuggestionPosition = (
  editorSurface: HTMLDivElement | null,
): SuggestionPosition => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !editorSurface) {
    return { bottom: 8, left: 16, top: 8 };
  }

  const rangeRect = selection.getRangeAt(0).getBoundingClientRect();
  const editorSurfaceRect = editorSurface.getBoundingClientRect();
  return {
    bottom: rangeRect.bottom - editorSurfaceRect.top + 8,
    left: rangeRect.left - editorSurfaceRect.left,
    top: rangeRect.top - editorSurfaceRect.top - 8,
  };
};

const buildSuggestion = (
  match: RegExpExecArray,
  prefixLength: number,
  position: SuggestionPosition,
  type: "mention" | "variable",
): ActiveSuggestion => {
  const query = match[1] ?? "";
  return {
    left: position.left,
    query,
    replaceLength: prefixLength + query.length,
    top: position.top > 160 ? position.top : position.bottom,
    type,
  };
};

const getActiveTemplateSuggestion = (
  textBeforeCursor: string,
  position: SuggestionPosition,
): ActiveSuggestion => {
  const variableMatch = /\{\{([a-zA-Z]*)$/.exec(textBeforeCursor);
  if (variableMatch)
    return buildSuggestion(variableMatch, 2, position, "variable");

  const mentionMatch = /@([^\s@<>]*)$/.exec(textBeforeCursor);
  if (mentionMatch)
    return buildSuggestion(mentionMatch, 1, position, "mention");
  return null;
};

const readTemplateEditorState = ({
  editorSurface,
  onChange,
  setActiveSuggestion,
}: {
  editorSurface: HTMLDivElement | null;
  onChange: (value: string) => void;
  setActiveSuggestion: (suggestion: ActiveSuggestion) => void;
}) => {
  onChange(serializeTemplateEditorValue());
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    setActiveSuggestion(null);
    return;
  }

  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode)) {
    setActiveSuggestion(null);
    return;
  }

  const textBeforeCursor = anchorNode
    .getTextContent()
    .slice(0, selection.anchor.offset);
  setActiveSuggestion(
    getActiveTemplateSuggestion(
      textBeforeCursor,
      getSuggestionPosition(editorSurface),
    ),
  );
};

export { createPreviewTemplateValues, renderTemplatePreview };

export const NotificationTemplateEditor = ({
  value,
  roles,
  triggerType,
  disabled = false,
  previewButtonClassName,
  onChange,
}: NotificationTemplateEditorProps) => {
  const isScheduledMessage =
    triggerType === NotificationTriggerType.SCHEDULED_MESSAGE;
  const { t } = useTranslation();
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [activeSuggestion, setActiveSuggestion] =
    useState<ActiveSuggestion>(null);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState({
    identity: "",
    index: 0,
  });
  const editorRef = useRef<LexicalEditor | null>(null);
  const editorSurfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    return editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        if (disabled) {
          return false;
        }

        const tokenNode = getBackspaceTemplateTokenNode();

        if (!tokenNode) {
          return false;
        }

        event.preventDefault();
        removeTemplateTokenNode(tokenNode);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [disabled]);

  const suggestionItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const editorPlaceholder = t(
    "settings.notifications.templateEditor.placeholder",
  );
  const previewTemplateValues = createPreviewTemplateValues(t);

  const allVariableSuggestions: VariableSuggestion[] = [
    {
      key: "ruleName",
      label: t("settings.notifications.templateEditor.variables.ruleName"),
      snippet: "{{ruleName}}",
      templateKey: "ruleName",
      type: "variable",
    },
    {
      key: "npcName",
      label: t("settings.notifications.templateEditor.variables.npcName"),
      snippet: "{{npcName}}",
      templateKey: "npcName",
      type: "variable",
    },
    {
      key: "npcId",
      label: t("settings.notifications.templateEditor.variables.npcId"),
      snippet: "{{npcId}}",
      templateKey: "npcId",
      type: "variable",
    },
    {
      key: "world",
      label: t("settings.notifications.templateEditor.variables.world"),
      snippet: "{{world}}",
      templateKey: "world",
      type: "variable",
    },
    {
      key: "minSpawnTime",
      label: t("settings.notifications.templateEditor.variables.minSpawnTime"),
      snippet: "{{minSpawnTime}}",
      templateKey: "minSpawnTime",
      type: "variable",
    },
    {
      key: "maxSpawnTime",
      label: t("settings.notifications.templateEditor.variables.maxSpawnTime"),
      snippet: "{{maxSpawnTime}}",
      templateKey: "maxSpawnTime",
      type: "variable",
    },
    {
      key: "scheduledFor",
      label: t("settings.notifications.templateEditor.variables.scheduledFor"),
      snippet: "{{scheduledFor}}",
      templateKey: "scheduledFor",
      type: "variable",
    },
  ];

  const variableSuggestions = isScheduledMessage
    ? allVariableSuggestions.filter((suggestion) =>
        SCHEDULED_MESSAGE_VARIABLE_KEYS.has(suggestion.key),
      )
    : allVariableSuggestions;

  const mentionSuggestions: MentionSuggestion[] = [
    {
      key: "everyone",
      label: "@everyone",
      snippet: "@everyone",
      type: "mention",
    },
    {
      key: "here",
      label: "@here",
      snippet: "@here",
      type: "mention",
    },
    ...roles.map((role) => ({
      key: role.id,
      label: `@${role.name}`,
      role,
      snippet: `<@&${role.id}> `,
      type: "mention" as const,
    })),
  ];

  const filteredSuggestions = getFilteredSuggestions(
    activeSuggestion,
    mentionSuggestions,
    variableSuggestions,
  );
  const activeSuggestionIdentity = activeSuggestion
    ? `${activeSuggestion.type}:${activeSuggestion.query}`
    : "";
  const highlightedSuggestionIndex =
    highlightedSuggestion.identity === activeSuggestionIdentity
      ? highlightedSuggestion.index
      : 0;

  useEffect(() => {
    const highlightedSuggestion =
      filteredSuggestions[highlightedSuggestionIndex];

    if (!highlightedSuggestion) {
      return;
    }

    suggestionItemRefs.current[highlightedSuggestion.key]?.scrollIntoView({
      block: "nearest",
    });
  }, [
    activeSuggestionIdentity,
    highlightedSuggestionIndex,
    filteredSuggestions,
  ]);

  const insertSuggestion = (
    suggestion: TemplateSuggestion,
    replaceLength = 0,
  ) => {
    const editor = editorRef.current;

    if (!editor || disabled) {
      return;
    }

    editor.focus();
    editor.update(() => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return;
      }

      const anchorNode = selection.anchor.getNode();

      if ($isTextNode(anchorNode) && replaceLength > 0) {
        anchorNode.spliceText(
          Math.max(0, selection.anchor.offset - replaceLength),
          replaceLength,
          "",
          true,
        );
      }

      const nextSelection = $getSelection();

      if (!$isRangeSelection(nextSelection)) {
        return;
      }

      if (suggestion.type === "variable") {
        nextSelection.insertNodes([
          $createNotificationTemplateVariableNode(suggestion.templateKey),
          $createTextNode(""),
        ]);
      } else {
        nextSelection.insertNodes([
          $createNotificationTemplateRoleNode({
            roleColor: suggestion.role
              ? getCustomRoleCssColor(suggestion.role.color)
              : null,
            roleId: suggestion.role?.id ?? suggestion.key,
            roleName: suggestion.role?.name ?? suggestion.label.slice(1),
          }),
          $createTextNode(""),
        ]);
      }
    });

    setActiveSuggestion(null);
  };

  const applyPreset = (presetValue: string) => {
    const editor = editorRef.current;

    if (!editor || disabled) {
      return;
    }

    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append(...createTemplateEditorNodes(presetValue, roles));
    });

    onChange(presetValue);
  };

  const timerPresets = [
    {
      key: "simple",
      label: t("settings.notifications.templateEditor.presets.simple"),
      value: TIMER_PRESET_SIMPLE,
    },
    {
      key: "detailed",
      label: t("settings.notifications.templateEditor.presets.detailed"),
      value: TIMER_PRESET_DETAILED,
    },
    {
      key: "minimal",
      label: t("settings.notifications.templateEditor.presets.minimal"),
      value: TIMER_PRESET_MINIMAL,
    },
  ];

  const scheduledMessagePresets = [
    {
      key: "simple",
      label: t("settings.notifications.templateEditor.presets.simple"),
      value: SCHEDULED_PRESET_SIMPLE,
    },
    {
      key: "minimal",
      label: t("settings.notifications.templateEditor.presets.minimal"),
      value: SCHEDULED_PRESET_MINIMAL,
    },
  ];

  const templatePresets = isScheduledMessage
    ? scheduledMessagePresets
    : timerPresets;

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!activeSuggestion || filteredSuggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      setHighlightedSuggestion((currentSuggestion) => {
        const currentIndex =
          currentSuggestion.identity === activeSuggestionIdentity
            ? currentSuggestion.index
            : 0;
        return {
          identity: activeSuggestionIdentity,
          index: (currentIndex + 1) % filteredSuggestions.length,
        };
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      setHighlightedSuggestion((currentSuggestion) => {
        const currentIndex =
          currentSuggestion.identity === activeSuggestionIdentity
            ? currentSuggestion.index
            : 0;
        return {
          identity: activeSuggestionIdentity,
          index:
            (currentIndex - 1 + filteredSuggestions.length) %
            filteredSuggestions.length,
        };
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      const selectedSuggestion =
        filteredSuggestions[highlightedSuggestionIndex];

      if (!selectedSuggestion) {
        return;
      }

      insertSuggestion(selectedSuggestion, activeSuggestion.replaceLength);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setActiveSuggestion(null);
    }
  };

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
                                  "bg-primary/50 text-accent-foreground",
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
            <div className="rounded-xl border border-border/60 bg-background px-4 py-4 text-sm">
              <div className="max-w-none whitespace-pre-wrap break-words text-foreground [&_blockquote]:rounded-md [&_blockquote]:border [&_blockquote]:border-border [&_blockquote]:px-3 [&_blockquote]:py-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_hr]:border-border [&_li]:ml-4 [&_p]:leading-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_strong]:font-semibold">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {renderTemplatePreview(value, previewTemplateValues)}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border border-dashed border-border/70 bg-background px-3 py-3">
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
