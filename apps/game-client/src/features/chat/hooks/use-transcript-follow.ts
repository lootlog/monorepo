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

export const getViewportPosition = (
  viewport: HTMLElement,
): ChatScrollPosition => {
  const box = viewport.getBoundingClientRect();

  const row = Array.from(
    viewport.querySelectorAll<HTMLElement>("[data-message-id]"),
  ).find((element) => element.getBoundingClientRect().bottom > box.top);

  return {
    atEnd:
      viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 1,
    messageId: row?.dataset.messageId,
    offset: row ? row.getBoundingClientRect().top - box.top : 0,
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
