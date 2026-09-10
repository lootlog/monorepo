import type { RoleResponseDtoOutput as GuildRole } from "@lootlog/client/main";
import { $getSelection, $isRangeSelection, $isTextNode } from "lexical";

import { serializeTemplateEditorValue } from "./notification-template-editor.utils";

export type MentionSuggestion = {
  key: string;
  label: string;
  role?: GuildRole;
  snippet: string;
  type: "mention";
};

export type VariableSuggestion = {
  key: string;
  label: string;
  snippet: string;
  templateKey: string;
  type: "variable";
};

export type TemplateSuggestion = MentionSuggestion | VariableSuggestion;

export const getFilteredSuggestions = (
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

export type ActiveSuggestion =
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

export type SuggestionPosition = {
  bottom: number;
  left: number;
  top: number;
};

export const getSuggestionPosition = (
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

export const buildSuggestion = (
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

export const getActiveTemplateSuggestion = (
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

export const readTemplateEditorState = ({
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
