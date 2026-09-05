import { createEmptyGuildDocumentContent } from "@lootlog/domain/guild-documents";
export const EMPTY_GUILD_DOC_EDITOR_CONTENT: GuildDocEditorContent =
  createEmptyGuildDocumentContent();
import type { GuildDocumentResponseDto } from "@lootlog/client/main";

export type GuildDocEditorContent = Exclude<
  GuildDocumentResponseDto["content"],
  null
>;

export const normalizeGuildDocEditorContent = (
  content: GuildDocumentResponseDto["content"] | GuildDocEditorContent,
): GuildDocEditorContent => {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return EMPTY_GUILD_DOC_EDITOR_CONTENT;
  }

  if (!("root" in content)) {
    return EMPTY_GUILD_DOC_EDITOR_CONTENT;
  }

  return content as GuildDocEditorContent;
};

export const stringifyGuildDocEditorContent = (
  content: GuildDocEditorContent,
) => JSON.stringify(content);
