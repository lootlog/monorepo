import { z } from "zod";
import { createEmptyGuildDocumentContent } from "@lootlog/domain/guild-documents";
export const EMPTY_GUILD_DOC_EDITOR_CONTENT: GuildDocEditorContent =
  createEmptyGuildDocumentContent();
import type { GuildDocumentResponseDto } from "@lootlog/client/main";

export type GuildDocEditorContent = Exclude<
  GuildDocumentResponseDto["content"],
  null
>;

export const guildDocContent = z
  .record(z.string(), z.json())
  .refine((content) => "root" in content);

export const normalizeGuildDocEditorContent = (
  content: GuildDocumentResponseDto["content"] | GuildDocEditorContent,
): GuildDocEditorContent =>
  guildDocContent.safeParse(content).data ?? EMPTY_GUILD_DOC_EDITOR_CONTENT;

export const stringifyGuildDocEditorContent = (
  content: GuildDocEditorContent,
) => JSON.stringify(content);
