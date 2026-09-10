import {
  CreateNotificationRuleDtoTriggerType as NotificationTriggerType,
  type CreateNotificationRuleDtoTriggerType,
  type RoleResponseDtoOutput as GuildRole,
} from "@lootlog/client/main";
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
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { getCustomRoleCssColor } from "@/utils/get-color-from-role";
import {
  SCHEDULED_PRESET_MINIMAL,
  SCHEDULED_PRESET_SIMPLE,
  TIMER_PRESET_DETAILED,
  TIMER_PRESET_MINIMAL,
  TIMER_PRESET_SIMPLE,
} from "../utils/notification-settings.utils";
import {
  createPreviewTemplateValues,
  createTemplateEditorNodes,
  getBackspaceTemplateTokenNode,
  removeTemplateTokenNode,
  SCHEDULED_MESSAGE_VARIABLE_KEYS,
} from "./notification-template-editor.utils";
import { $createNotificationTemplateRoleNode } from "./notification-template-role-node";
import { $createNotificationTemplateVariableNode } from "./notification-template-variable-node";

type NotificationTemplateEditorProps = {
  value: string;
  roles: GuildRole[];
  triggerType?: CreateNotificationRuleDtoTriggerType;
  disabled?: boolean;
  previewButtonClassName?: string;
  onChange: (value: string) => void;
};

import {
  getFilteredSuggestions,
  type ActiveSuggestion,
  type MentionSuggestion,
  type TemplateSuggestion,
  type VariableSuggestion,
} from "./notification-template-suggestion";

export const useNotificationTemplateEditor = ({
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

  return {
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
  };
};
