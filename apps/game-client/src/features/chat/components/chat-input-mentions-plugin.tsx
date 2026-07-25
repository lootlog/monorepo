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
} from "@/features/chat/chat-mentions.helpers";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from "lexical";
import { useEffect, type FC } from "react";

type ChatInputMentionsPluginProps = {
  mentionContext?: ChatMentionContext;
};

const getExpectedMentionSignature = (
  message: string,
  mentionContext?: ChatMentionContext,
) => {
  return getChatMentionSegments(message, mentionContext)
    .filter((segment) => segment.isMention)
    .map((segment) => {
      return [
        segment.text,
        segment.kind,
        segment.normalizedName,
        segment.color,
      ].join(":");
    })
    .join("|");
};

const getCurrentMentionSignature = () => {
  return $getRoot()
    .getAllTextNodes()
    .filter($isChatMentionNode)
    .map((node) => {
      const serializedNode = node.exportJSON();

      return [
        node.getTextContent(),
        serializedNode.kind,
        serializedNode.identifier,
        serializedNode.color,
      ].join(":");
    })
    .join("|");
};

const rebuildMentionNodes = (mentionContext?: ChatMentionContext) => {
  const root = $getRoot();
  const message = root.getTextContent();
  const selection = $getSelection();
  const selectionOffsets = $isRangeSelection(selection)
    ? $getChatInputSelectionOffsets(selection)
    : null;
  const segments = getChatMentionSegments(message, mentionContext);
  const paragraph = $createParagraphNode();

  for (const segment of segments) {
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

export const ChatInputMentionsPlugin: FC<ChatInputMentionsPluginProps> = ({
  mentionContext,
}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const reconcileMentions = () => {
      const shouldRebuild = editor.getEditorState().read(() => {
        const message = $getRoot().getTextContent();

        return (
          getCurrentMentionSignature() !==
          getExpectedMentionSignature(message, mentionContext)
        );
      });

      if (shouldRebuild) {
        editor.update(() => {
          rebuildMentionNodes(mentionContext);
        });
      }
    };

    reconcileMentions();
    return editor.registerUpdateListener(reconcileMentions);
  }, [editor, mentionContext]);

  return null;
};
