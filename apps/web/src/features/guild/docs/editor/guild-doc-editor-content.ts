import type { GuildDocumentResponseDto } from "@lootlog/client/main";

export type GuildDocEditorContent = Exclude<
  GuildDocumentResponseDto["content"],
  null
>;

export const EMPTY_GUILD_DOC_EDITOR_CONTENT: GuildDocEditorContent = {
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
};

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
