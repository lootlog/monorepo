import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { MessageScroller } from "@shadcn/react/message-scroller";
import type { ComponentType, ReactElement, ReactNode, RefObject } from "react";
import { ScrollToLatestButton } from "@/components/common/scroll-to-latest-button";
import { ScrollBar } from "@/components/ui/scroll-bar";
import { getChatDensityStyle } from "../chat-density";
import { useTranscriptFollow } from "../hooks/use-transcript-follow";

type ChatTranscriptViewportProps = {
  viewport: RefObject<HTMLDivElement | null>;
  ariaLabel: string;
  latestLabel: string;
  fontScalePercent: number;
  /** Shown in place of the hidden viewport while there are no rows. */
  empty: ReactNode | null;
  /** Floats above the rows, such as the older-history status. */
  overlay?: ReactNode;
  /** Keeps the reader's rows in place when older history is prepended. */
  preserveScrollOnPrepend?: boolean;
  /** Lets the reader select any text in the rows, not only message bodies. */
  selectableText?: boolean;
  onScroll?: () => void;
  /** The transcript's shared popups; the row list becomes their trigger. */
  popups: ComponentType<{ children: ReactElement }>;
  children: ReactNode;
};

/**
 * The scrolling frame both chats share: it follows the newest message, keeps
 * the reader's position while they hold or scroll, and offers a way back to
 * the latest message.
 */
export const ChatTranscriptViewport = ({
  viewport,
  ariaLabel,
  latestLabel,
  fontScalePercent,
  empty,
  overlay,
  preserveScrollOnPrepend,
  selectableText,
  onScroll,
  popups: Popups,
  children,
}: ChatTranscriptViewportProps) => {
  const { holdPosition, resumeAtEnd, resumeOnWheel } =
    useTranscriptFollow(viewport);

  return (
    <BaseScrollArea.Root
      render=<MessageScroller.Root />
      className="ll:relative ll:flex ll:size-full ll:min-h-0 ll:flex-col ll:overflow-hidden"
    >
      {empty}
      {overlay}
      <BaseScrollArea.Viewport
        render=<MessageScroller.Viewport
          preserveScrollOnPrepend={preserveScrollOnPrepend}
        />
        ref={viewport}
        aria-label={ariaLabel}
        hidden={empty !== null}
        data-chat-viewport={selectableText || undefined}
        data-scroll-fade-viewport
        data-ll-draggable="false"
        className="ll:scroll-fade-y ll:scroll-fade-4 ll:size-full ll:min-h-0 ll:overflow-y-auto ll:overscroll-contain ll:rounded ll:outline-none ll:focus-visible:ring-1 ll:focus-visible:ring-inset ll:focus-visible:ring-ring"
        style={{ overflowAnchor: "auto", overflowX: "hidden" }}
        onPointerDown={holdPosition}
        onScroll={() => {
          resumeAtEnd();
          onScroll?.();
        }}
        onWheel={resumeOnWheel}
      >
        <Popups>
          <BaseScrollArea.Content
            render=<MessageScroller.Content />
            role="list"
            aria-live="off"
            className="ll-chat-message-list ll:flex ll:h-max ll:min-h-full ll:w-full ll:min-w-0 ll:flex-col"
            style={getChatDensityStyle(fontScalePercent)}
          >
            {children}
          </BaseScrollArea.Content>
        </Popups>
      </BaseScrollArea.Viewport>
      <ScrollBar />
      <ScrollToLatestButton label={latestLabel} />
    </BaseScrollArea.Root>
  );
};
