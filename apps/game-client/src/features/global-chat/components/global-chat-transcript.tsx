import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import {
  MessageScroller,
  useMessageScrollerScrollable,
} from "@shadcn/react/message-scroller";
import { useEffect, useEffectEvent } from "react";
import { useTranslation } from "react-i18next";
import type { ChatAppearanceSettings } from "@lootlog/schema/chat-appearance";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { ScrollToLatestButton } from "@/components/common/scroll-to-latest-button";
import { ScrollBar } from "@/components/ui/scroll-bar";
import { Spinner } from "@/components/ui/spinner";
import { getChatDensityStyle } from "@/features/chat/chat-density";
import type { GlobalChatRow as GlobalChatRowData } from "../global-chat.helpers";
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
  const isEmpty = rows.length === 0;
  // Also true while the history is shorter than the viewport, which fills it.
  const atStart = !isEmpty && !start;
  const loadOlder = useEffectEvent(onLoadOlder);

  useEffect(() => {
    if (atStart && hasOlder && !loadingOlder && !olderFailed) loadOlder();
  }, [atStart, hasOlder, loadingOlder, olderFailed]);

  return (
    <BaseScrollArea.Root
      render=<MessageScroller.Root />
      className="ll:relative ll:flex ll:size-full ll:min-h-0 ll:flex-col ll:overflow-hidden"
    >
      {isEmpty ? (
        <EmptyState
          title={t("emptyState.title")}
          description={t("emptyState.description")}
        />
      ) : null}
      {loadingOlder ? (
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
      ) : null}
      <BaseScrollArea.Viewport
        render=<MessageScroller.Viewport preserveScrollOnPrepend />
        aria-label={t("window.title")}
        hidden={isEmpty}
        data-scroll-fade-viewport
        data-ll-draggable="false"
        className="ll:scroll-fade-y ll:scroll-fade-4 ll:size-full ll:min-h-0 ll:overflow-y-auto ll:overscroll-contain ll:rounded ll:outline-none ll:focus-visible:ring-1 ll:focus-visible:ring-inset ll:focus-visible:ring-ring"
        style={{ overflowAnchor: "auto", overflowX: "hidden" }}
      >
        <BaseScrollArea.Content
          render=<MessageScroller.Content />
          role="list"
          aria-live="off"
          className="ll-chat-message-list ll:flex ll:h-max ll:min-h-full ll:w-full ll:min-w-0 ll:flex-col"
          style={getChatDensityStyle(appearance.fontScalePercent)}
        >
          {rows.map((row) => (
            <GlobalChatRow
              key={row.key}
              appearance={appearance}
              context={rowContext}
              row={row}
            />
          ))}
        </BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      <ScrollBar />
      <ScrollToLatestButton label={t("navigation.latest")} />
    </BaseScrollArea.Root>
  );
};
