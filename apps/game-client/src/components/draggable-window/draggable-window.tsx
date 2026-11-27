import type { FC } from "react";
import { useMobileMode } from "@/hooks/ui/use-mobile-mode";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import {
  isMobileAlertWindowId,
  isMobilePanelWindowId,
  isMobilePromptWindowId,
} from "@/lib/mobile-ui/mobile-windows";
import { DraggableWindowFrame } from "./draggable-window-frame";
import { MobileAlertFrame } from "./mobile-alert-frame";
import { MobilePanelFrame } from "./mobile-panel-frame";
import { MobilePromptFrame } from "./mobile-prompt-frame";
import type { DraggableWindowFrameProps } from "./use-draggable-window-frame";

export type DraggableWindowProps = Omit<
  DraggableWindowFrameProps,
  "animationPhase" | "onWindowAnimationEnd"
> & {
  isOpen: boolean;
};

export const DraggableWindow: FC<DraggableWindowProps> = ({
  isOpen,
  ...windowProps
}) => {
  const { isMobile } = useMobileMode();
  const { onAnimationEnd, phase, shouldRender } = useWindowPresence(isOpen);

  if (!shouldRender) return null;

  if (isMobile) {
    if (isMobilePanelWindowId(windowProps.id)) {
      return (
        <MobilePanelFrame
          id={windowProps.id}
          title={windowProps.title}
          actions={windowProps.actions}
          closable={windowProps.closable}
          onClose={windowProps.onClose}
          animationPhase={phase}
          onWindowAnimationEnd={onAnimationEnd}
        >
          {windowProps.children}
        </MobilePanelFrame>
      );
    }

    if (isMobileAlertWindowId(windowProps.id)) {
      return (
        <MobileAlertFrame
          id={windowProps.id}
          title={windowProps.title}
          closable={windowProps.closable}
          onClose={windowProps.onClose}
          contentClassName={windowProps.contentClassName}
          animationPhase={phase}
          onWindowAnimationEnd={onAnimationEnd}
        >
          {windowProps.children}
        </MobileAlertFrame>
      );
    }

    if (isMobilePromptWindowId(windowProps.id)) {
      return (
        <MobilePromptFrame
          id={windowProps.id}
          title={windowProps.title}
          actions={windowProps.actions}
          closable={windowProps.closable}
          onClose={windowProps.onClose}
          contentClassName={windowProps.contentClassName}
          animationPhase={phase}
          onWindowAnimationEnd={onAnimationEnd}
        >
          {windowProps.children}
        </MobilePromptFrame>
      );
    }
  }

  return (
    <DraggableWindowFrame
      {...windowProps}
      animationPhase={phase}
      onWindowAnimationEnd={onAnimationEnd}
    />
  );
};
