import { cn } from "cn";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  type FC,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { releaseWindowFocus } from "@/components/draggable-window/use-draggable-window-frame";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import { useWindowsStore } from "@/store/windows.store";

type CommandOverlayProps = {
  children: ReactNode;
  label: string;
  open: boolean;
  onDismiss: () => void;
  onEscape: () => void;
};

const KEEP_OPEN_SELECTOR =
  '[data-slot="popover-content"], [data-slot="select-content"], [data-ll-window-toggle="command"]';

export const CommandOverlay: FC<CommandOverlayProps> = ({
  children,
  label,
  open,
  onDismiss,
  onEscape,
}) => {
  const { onAnimationEnd, phase, shouldRender } = useWindowPresence(open);
  const overlayRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const focusRequest = useWindowsStore((state) =>
    state.focusRequest?.windowId === "command" ? state.focusRequest : undefined,
  );

  const clearFocusRequest = useWindowsStore((state) => state.clearFocusRequest);

  useLayoutEffect(() => {
    if (!focusRequest) return;
    returnFocusRef.current = focusRequest.returnFocusTo;
    clearFocusRequest("command");
  }, [clearFocusRequest, focusRequest]);

  useLayoutEffect(() => {
    const element = overlayRef.current;

    if (phase !== "exit" || !element) return;

    releaseWindowFocus(element, returnFocusRef.current);
  }, [phase]);

  useLayoutEffect(() => {
    const element = overlayRef.current;

    if (!shouldRender || !element) return;

    return () => releaseWindowFocus(element, returnFocusRef.current);
  }, [shouldRender]);

  const dismissOnOutsidePress = useEffectEvent((event: PointerEvent) => {
    const { target } = event;

    if (!(target instanceof Element)) return;

    if (overlayRef.current?.contains(target)) return;

    if (target.closest(KEEP_OPEN_SELECTOR)) return;
    onDismiss();
  });

  useEffect(() => {
    if (!open) return;

    document.addEventListener("pointerdown", dismissOnOutsidePress, true);

    return () =>
      document.removeEventListener("pointerdown", dismissOnOutsidePress, true);
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.nativeEvent.isComposing) return;

    event.stopPropagation();

    if (
      event.defaultPrevented ||
      !(event.target instanceof Node) ||
      !event.currentTarget.contains(event.target)
    )
      return;

    if (phase === "exit") return;
    event.preventDefault();
    onEscape();
  };

  if (!shouldRender) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-label={label}
      aria-hidden={phase === "exit" ? true : undefined}
      data-ll-command-overlay=""
      className="ll:pointer-events-auto ll:absolute ll:top-[12vh] ll:left-1/2 ll:z-[450] ll:w-[min(440px,calc(100vw-32px))] ll:-translate-x-1/2"
      style={{ pointerEvents: phase === "exit" ? "none" : undefined }}
      onKeyDown={handleKeyDown}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        className={cn(
          "ll:relative ll:flex ll:flex-col ll:rounded-lg ll:border ll:border-white/50 ll:bg-black ll:text-white ll:shadow-[0_18px_48px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,0,0,0.8)]",
          {
            "ll-window-preparing": phase === "preparing",
            "ll-window-enter": phase === "enter",
            "ll-window-exit": phase === "exit",
          },
        )}
        onAnimationEnd={(event) => {
          if (event.currentTarget !== event.target) return;

          if (phase !== "enter" && phase !== "exit") return;

          if (event.animationName !== `ll-window-${phase}`) return;
          onAnimationEnd();
        }}
      >
        {children}
      </div>
    </div>
  );
};
