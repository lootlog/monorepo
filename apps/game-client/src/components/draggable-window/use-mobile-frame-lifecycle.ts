import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { WindowAnimationPhase } from "@/hooks/ui/use-window-presence";
import { useWindowsStore, type WindowId } from "@/store/windows.store";
import { releaseWindowFocus } from "./use-draggable-window-frame";

export const useWindowFocusLifecycle = (
  id: WindowId,
  animationPhase: WindowAnimationPhase,
  dialogRef: RefObject<HTMLDivElement | null>,
) => {
  const focusRequest = useWindowsStore((state) =>
    state.focusRequest?.windowId === id ? state.focusRequest : undefined,
  );

  const clearFocusRequest = useWindowsStore((state) => state.clearFocusRequest);

  const returnFocusRef = useRef<HTMLElement | null>(null);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- focuses the mounted dialog element on explicit user open and restores prior DOM focus on exit
  useLayoutEffect(() => {
    if (!focusRequest || animationPhase === "exit") return;
    const element = dialogRef.current;

    if (!element) return;
    const { returnFocusTo } = focusRequest;

    returnFocusRef.current =
      returnFocusTo && !element.contains(returnFocusTo) ? returnFocusTo : null;

    if (!element.contains(document.activeElement)) {
      element.focus({ preventScroll: true });
    }

    clearFocusRequest(id);
  }, [animationPhase, clearFocusRequest, dialogRef, focusRequest, id]);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- releases DOM focus from the exiting window back to the previously focused element
  useLayoutEffect(() => {
    const element = dialogRef.current;

    if (animationPhase !== "exit" || !element) return;

    releaseWindowFocus(element, returnFocusRef.current);
  }, [animationPhase, dialogRef]);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- releases DOM focus when the dialog unmounts before animation exit finishes
  useLayoutEffect(() => {
    const element = dialogRef.current;

    return () => {
      if (element) releaseWindowFocus(element, returnFocusRef.current);
    };
  }, [dialogRef]);
};

export const useWindowAnimationCancel = (
  bodyRef: RefObject<HTMLDivElement | null>,
  animationPhase: WindowAnimationPhase,
  animationPrefix: string,
  onWindowAnimationEnd: () => void,
) => {
  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- listens to native DOM animationcancel events so cancelled CSS animations finish cleanly
  useEffect(() => {
    const body = bodyRef.current;

    if (!body || (animationPhase !== "enter" && animationPhase !== "exit")) {
      return;
    }

    const expectedAnimationName = `${animationPrefix}-${animationPhase}`;

    const handleAnimationCancel = (event: AnimationEvent) => {
      if (
        event.target === body &&
        event.animationName === expectedAnimationName
      ) {
        onWindowAnimationEnd();
      }
    };

    body.addEventListener("animationcancel", handleAnimationCancel);

    return () => {
      body.removeEventListener("animationcancel", handleAnimationCancel);
    };
  }, [animationPhase, animationPrefix, bodyRef, onWindowAnimationEnd]);
};
