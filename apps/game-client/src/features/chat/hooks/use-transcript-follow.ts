import { useMessageScroller } from "@shadcn/react/message-scroller";
import {
  useEffect,
  useEffectEvent,
  useRef,
  type PointerEvent,
  type RefObject,
  type WheelEvent,
} from "react";
import type { ChatScrollPosition } from "../components/chat-transcript";

/** The transcript's message rows in document order, without date dividers. */
export const getMessageRows = (viewport: HTMLElement): HTMLElement[] => {
  const list = viewport.querySelector("[data-message-id]")?.parentElement;

  if (!list) return [];

  return Array.from(list.children).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element.dataset.messageId !== undefined,
  );
};

export const getViewportPosition = (
  viewport: HTMLElement,
): ChatScrollPosition => {
  const box = viewport.getBoundingClientRect();
  const rows = getMessageRows(viewport);
  // Rows stack top to bottom, so the first one reaching into the viewport is
  // found by bisection instead of measuring every row above it.
  let low = 0;
  let high = rows.length;
  let rowTop = 0;

  while (low < high) {
    const middle = (low + high) >>> 1;
    const rect = rows[middle]?.getBoundingClientRect();

    if (rect !== undefined && rect.bottom > box.top) {
      high = middle;
      rowTop = rect.top;
    } else {
      low = middle + 1;
    }
  }

  const row = rows[low];

  return {
    atEnd:
      viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 1,
    messageId: row?.dataset.messageId,
    offset: row ? rowTop - box.top : 0,
  };
};

/**
 * Keeps a MessageScroller transcript following new messages. The scroller
 * stops following on every wheel, touch or key scroll, even one at the bottom
 * that moves nothing, so following resumes whenever the reader is back at the
 * bottom. A held pointer pins the rows under it until release, so selecting
 * text is not moved by arriving messages.
 */
export const useTranscriptFollow = (
  viewport: RefObject<HTMLDivElement | null>,
) => {
  const { scrollToMessage, scrollToEnd } = useMessageScroller();
  const pointerHeld = useRef(false);

  const holdPosition = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest("button, a, input, textarea, [contenteditable=true]")
    )
      return;
    const element = viewport.current;

    if (!element) return;
    const position = getViewportPosition(element);
    pointerHeld.current = true;

    if (position.messageId)
      scrollToMessage(position.messageId, {
        align: "start",
        scrollMargin: position.offset,
        behavior: "instant",
      });
  };

  const resumeAtEnd = () => {
    const element = viewport.current;

    if (
      element &&
      !pointerHeld.current &&
      !window.getSelection()?.toString() &&
      element.scrollHeight - element.clientHeight - element.scrollTop <= 1
    ) {
      scrollToEnd({ behavior: "instant" });
    }
  };

  const resumeOnWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (event.deltaY > 0) resumeAtEnd();
  };

  const releasePosition = useEffectEvent(() => {
    if (!pointerHeld.current) return;
    pointerHeld.current = false;
    resumeAtEnd();
  });

  useEffect(() => {
    window.addEventListener("pointerup", releasePosition);
    window.addEventListener("pointercancel", releasePosition);

    return () => {
      window.removeEventListener("pointerup", releasePosition);
      window.removeEventListener("pointercancel", releasePosition);
    };
  }, []);

  return { holdPosition, resumeAtEnd, resumeOnWheel };
};
