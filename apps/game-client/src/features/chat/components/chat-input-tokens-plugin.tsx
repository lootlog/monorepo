import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createChatMentionNode,
  $isChatMentionNode,
} from "@/features/chat/chat-mention-node";
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

type ChatInputTokensPluginProps = {
  mentionContext?: ChatMentionContext;
};

const getSegmentSignature = (segment: ChatMentionSegment) => {
  if (!segment.isMention) return null;

  return [
    segment.text,
    segment.kind,
    segment.normalizedName,
    segment.color,
  ].join(":");
};

/** Mentions are found in the whole text, exactly as the chat renders it. */
const getExpectedSignature = (
  message: string,
  mentionContext?: ChatMentionContext,
) => {
  return getChatMentionSegments(message, mentionContext)
    .flatMap((segment) => getSegmentSignature(segment) ?? [])
    .join("|");
};

const getCurrentSignature = () => {
  return $getRoot()
    .getAllTextNodes()
    .flatMap((node) => {
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

const rebuildTokenNodes = (mentionContext?: ChatMentionContext) => {
  const root = $getRoot();
  const message = root.getTextContent();
  const selection = $getSelection();

  const selectionOffsets = $isRangeSelection(selection)
    ? $getChatInputSelectionOffsets(selection)
    : null;

  const paragraph = $createParagraphNode();

  for (const segment of getChatMentionSegments(message, mentionContext)) {
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

/** Keeps the editor's atomic mention nodes in step with its text. */
export const ChatInputTokensPlugin: FC<ChatInputTokensPluginProps> = ({
  mentionContext,
}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const reconcileTokens = () => {
      const shouldRebuild = editor.getEditorState().read(() => {
        const message = $getRoot().getTextContent();

        return (
          getCurrentSignature() !==
          getExpectedSignature(message, mentionContext)
        );
      });

      if (shouldRebuild) {
        editor.update(() => {
          rebuildTokenNodes(mentionContext);
        });
      }
    };

    reconcileTokens();

    return editor.registerUpdateListener(reconcileTokens);
  }, [editor, mentionContext]);

  return null;
};
