import type { SerializedEditorState } from "lexical";
import { Option, Schema } from "effect";
import { createEmptyGuildDocumentContent } from "@lootlog/domain/guild-documents";

export const EMPTY_GUILD_DOC_EDITOR_CONTENT: GuildDocEditorContent =
  createEmptyGuildDocumentContent();

import type { GuildDocumentResponseDto } from "@lootlog/client/main";

export type GuildDocEditorContent = Exclude<
  GuildDocumentResponseDto["content"],
  null
>;

const decodeGuildDocContent = Schema.decodeUnknownOption(
  Schema.Record(Schema.String, Schema.MutableJson).check(
    Schema.makeFilter((content) => "root" in content),
  ),
);

export const normalizeGuildDocEditorContent = (
  content: GuildDocumentResponseDto["content"] | GuildDocEditorContent,
): GuildDocEditorContent =>
  Option.getOrElse(
    decodeGuildDocContent(content),
    () => EMPTY_GUILD_DOC_EDITOR_CONTENT,
  );

/**
 * Lexical serializes optional node fields as explicit `undefined`, which is not
 * valid JSON. Round-tripping through JSON drops them, so the draft holds the
 * exact document that gets persisted and compared against the saved revision.
 */
export const serializeGuildDocEditorState = (
  state: SerializedEditorState,
): GuildDocEditorContent | null =>
  Option.getOrNull(decodeGuildDocContent(JSON.parse(JSON.stringify(state))));

export const stringifyGuildDocEditorContent = (
  content: GuildDocEditorContent,
) => JSON.stringify(content);
