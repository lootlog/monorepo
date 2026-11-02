import { useMessageScrollerScrollable } from "@shadcn/react/message-scroller";
import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { GlobalChatRow as GlobalChatRowData } from "../global-chat.helpers";
import { SharedContextMenu } from "@/components/common/shared-context-menu";
import { ChatTranscriptViewport } from "@/features/chat/components/chat-transcript-viewport";
import { GlobalChatRow, type GlobalChatRowContext } from "./global-chat-row";

type GlobalChatTranscriptProps = {
  appearance: ChatAppearanceSettings;
  rows: GlobalChatRowData[];
  rowContext: GlobalChatRowContext;
  hasOlder: boolean;
  loadingOlder: boolean;
  /** A failed older page waits for the player instead of retrying in a loop. */
  olderFailed: boolean;
  onLoadOlder: () => void;
};

/** Follows the newest message and reads an older page when scrolled to the top. */
export const GlobalChatTranscript = ({
  appearance,
  rows,
  rowContext,
  hasOlder,
  loadingOlder,
  olderFailed,
  onLoadOlder,
}: GlobalChatTranscriptProps) => {
  const { t } = useTranslation("globalChat");
  const { start } = useMessageScrollerScrollable();
  const viewport = useRef<HTMLDivElement>(null);
  const isEmpty = rows.length === 0;
  // Also true while the history is shorter than the viewport, which fills it.
  const atStart = !isEmpty && !start;
  const loadOlder = useEffectEvent(onLoadOlder);

  useEffect(() => {
    if (atStart && hasOlder && !loadingOlder && !olderFailed) loadOlder();
  }, [atStart, hasOlder, loadingOlder, olderFailed]);

  return (
    <ChatTranscriptViewport
      viewport={viewport}
      ariaLabel={t("window.title")}
      latestLabel={t("navigation.latest")}
      fontScalePercent={appearance.fontScalePercent}
      empty={
        isEmpty ? (
          <EmptyState
            title={t("emptyState.title")}
            description={t("emptyState.description")}
          />
        ) : null
      }
      overlay={
        loadingOlder ? (
          <div
            role="status"
            className="ll:absolute ll:top-1 ll:left-1/2 ll:z-20 ll:-translate-x-1/2"
          >
            <span className="ll:sr-only">{t("states.loadingOlder")}</span>
            <Spinner className="ll:size-4 ll:text-gray-300" />
          </div>
        ) : olderFailed ? (
          <Button
            variant="secondary"
            size="xs"
            className="ll:absolute ll:top-1 ll:left-1/2 ll:z-20 ll:h-6 ll:-translate-x-1/2 ll:px-2 ll:shadow-md"
            onClick={onLoadOlder}
          >
            {t("actions.retryOlder")}
          </Button>
        ) : null
      }
      preserveScrollOnPrepend
      popups={SharedContextMenu}
    >
      {rows.map((row) => (
        <GlobalChatRow
          key={row.key}
          appearance={appearance}
          context={rowContext}
          row={row}
        />
      ))}
    </ChatTranscriptViewport>
  );
};
