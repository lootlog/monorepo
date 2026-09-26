import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createChatMentionNode,
  $isChatMentionNode,
} from "@/features/chat/chat-mention-node";
import {
  $createChatCommandNode,
  $isChatCommandNode,
} from "@/features/chat/chat-command-node";
import {
  getChatCommandPrefix,
  type ChatCommandPrefixKind,
} from "@/features/chat/chat-command-prefix";
import {
  $getChatInputSelectionOffsets,
  $selectChatInputRange,
} from "@/features/chat/chat-input-editor.helpers";
import {
  getChatMentionSegments,
  type ChatMentionContext,
  type ChatMentionSegment,
} from "@/features/chat/chat-mentions.helpers";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from "lexical";
import { useEffect, type FC } from "react";

export type ChatCommandHints = Record<ChatCommandPrefixKind, string>;

type ChatInputTokensPluginProps = {
  commandHints?: ChatCommandHints;
  mentionContext?: ChatMentionContext;
};

type ChatInputToken =
  | {
      type: "command";
      kind: ChatCommandPrefixKind;
      hint: string | null;
      text: string;
    }
  | { type: "text"; segment: ChatMentionSegment };

/**
 * Splits the message into the command chip, resolved mentions and plain text.
 * Mentions are found in the whole message, exactly as the chat renders it,
 * and the prefix is then cut from the leading plain text.
 */
const getChatInputTokens = (
  message: string,
  mentionContext?: ChatMentionContext,
  commandHints?: ChatCommandHints,
): ChatInputToken[] => {
  const prefix = getChatCommandPrefix(message);
  const segments = getChatMentionSegments(message, mentionContext);

  if (!prefix) {
    return segments.map((segment) => ({ type: "text", segment }));
  }

  const tokens: ChatInputToken[] = [
    {
      type: "command",
      kind: prefix.kind,
      hint: prefix.hasArgument ? null : (commandHints?.[prefix.kind] ?? null),
      text: prefix.text,
    },
  ];

  let prefixLeft = prefix.text.length;

  for (const segment of segments) {
    const cut = segment.isMention
      ? 0
      : Math.min(prefixLeft, segment.text.length);

    prefixLeft -= cut;
    const text = segment.text.slice(cut);

    if (text) tokens.push({ type: "text", segment: { ...segment, text } });
  }

  return tokens;
};

const getTokenSignature = (token: ChatInputToken) => {
  if (token.type === "command") {
    return ["command", token.text, token.kind, token.hint].join(":");
  }

  const { segment } = token;

  if (!segment.isMention) return null;

  return [
    segment.text,
    segment.kind,
    segment.normalizedName,
    segment.color,
  ].join(":");
};

const getExpectedSignature = (
  message: string,
  mentionContext?: ChatMentionContext,
  commandHints?: ChatCommandHints,
) => {
  return getChatInputTokens(message, mentionContext, commandHints)
    .flatMap((token) => getTokenSignature(token) ?? [])
    .join("|");
};

const getCurrentSignature = () => {
  return $getRoot()
    .getAllTextNodes()
    .flatMap((node) => {
      if ($isChatCommandNode(node)) {
        const serializedNode = node.exportJSON();

        return [
          [
            "command",
            node.getTextContent(),
            serializedNode.kind,
            serializedNode.hint,
          ].join(":"),
        ];
      }

      if (!$isChatMentionNode(node)) return [];
      const serializedNode = node.exportJSON();

      return [
        [
          node.getTextContent(),
          serializedNode.kind,
          serializedNode.identifier,
          serializedNode.color,
        ].join(":"),
      ];
    })
    .join("|");
};

const rebuildTokenNodes = (
  mentionContext?: ChatMentionContext,
  commandHints?: ChatCommandHints,
) => {
  const root = $getRoot();
  const message = root.getTextContent();
  const selection = $getSelection();

  const selectionOffsets = $isRangeSelection(selection)
    ? $getChatInputSelectionOffsets(selection)
    : null;

  const paragraph = $createParagraphNode();

  for (const token of getChatInputTokens(
    message,
    mentionContext,
    commandHints,
  )) {
    if (token.type === "command") {
      paragraph.append(
        $createChatCommandNode({
          hint: token.hint,
          kind: token.kind,
          text: token.text,
        }),
      );
      continue;
    }

    const { segment } = token;

    if (
      segment.isMention &&
      segment.kind &&
      segment.normalizedName !== undefined
    ) {
      paragraph.append(
        $createChatMentionNode({
          color: segment.color ?? null,
          identifier: segment.normalizedName,
          kind: segment.kind,
          label: segment.text,
        }),
      );
      continue;
    }

    paragraph.append($createTextNode(segment.text));
  }

  root.clear().append(paragraph);

  if (!selectionOffsets) {
    return;
  }

  $selectChatInputRange(selectionOffsets[0], selectionOffsets[1]);
};

/** Keeps the editor's atomic nodes (command chip, mentions) in step with its text. */
export const ChatInputTokensPlugin: FC<ChatInputTokensPluginProps> = ({
  commandHints,
  mentionContext,
}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const reconcileTokens = () => {
      const shouldRebuild = editor.getEditorState().read(() => {
        const message = $getRoot().getTextContent();

        return (
          getCurrentSignature() !==
          getExpectedSignature(message, mentionContext, commandHints)
        );
      });

      if (shouldRebuild) {
        editor.update(() => {
          rebuildTokenNodes(mentionContext, commandHints);
        });
      }
    };

    reconcileTokens();

    return editor.registerUpdateListener(reconcileTokens);
  }, [commandHints, editor, mentionContext]);

  return null;
};
