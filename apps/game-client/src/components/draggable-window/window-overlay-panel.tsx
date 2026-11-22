import { useId, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "cn";
import {
  toolbarStripClassName,
  toolbarStripRowClassName,
} from "@/components/ui/toolbar-strip";

type WindowOverlayPanelProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
};

export const WindowOverlayPanel = ({
  title,
  subtitle,
  onClose,
  className,
  children,
}: WindowOverlayPanelProps) => {
  const titleId = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
      className={cn(
        "ll:absolute ll:inset-0 ll:z-20 ll:flex ll:flex-col ll:overflow-hidden ll:bg-black/90",
        className,
      )}
    >
      <div
        className={cn(
          toolbarStripClassName,
          toolbarStripRowClassName,
          "ll:-mt-px ll:shrink-0 ll:items-center ll:px-3",
        )}
      >
        <span
          id={titleId}
          className="ll:flex ll:min-w-0 ll:items-baseline ll:gap-1.5 ll:text-xs ll:font-semibold ll:text-gray-100"
        >
          {title}
          {subtitle ? (
            <span className="ll:truncate ll:text-[11px] ll:font-normal ll:text-gray-400">
              {subtitle}
            </span>
          ) : null}
        </span>
      </div>
      {children}
    </div>
  );
};
