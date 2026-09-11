import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "cn";
import type { FC, KeyboardEvent, ReactNode } from "react";

type SettingsWindowShellProps = {
  compact: boolean;
  /** Domain navigation (wide list or icon rail). */
  nav: ReactNode;
  /** Search field plus results; overlaid on the rail when compact. */
  search: ReactNode;
  searchOverlayOpen: boolean;
  /** Segmented subsection bar; omitted for single-subsection domains. */
  subsections?: ReactNode;
  children: ReactNode;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

/**
 * Navigation column. It stays inside the window frame padding, starts level
 * with the content and stops the same distance above the bottom edge, so its
 * hairline is inset equally at both ends.
 */
const navColumnClassName =
  "ll:flex ll:min-h-0 ll:shrink-0 ll:border-0 ll:border-e ll:border-gray-400/30 ll:bg-black/15 ll:mt-1 ll:mb-2 ll:rounded-s-sm ll:pt-0.5 ll:pb-1 ll:ps-2";

/**
 * Layout for the settings window: navigation column, subsection bar and the
 * scrolling content column, sharing one compact type scale.
 */
export const SettingsWindowShell: FC<SettingsWindowShellProps> = ({
  compact,
  nav,
  search,
  searchOverlayOpen,
  subsections,
  children,
  onKeyDown,
}) => (
  // Shortcuts apply only while focus is inside the window.
  // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
  <div
    className="ll:relative ll:flex ll:h-full ll:min-h-0 ll:w-full ll:flex-row ll:text-xs"
    onKeyDown={onKeyDown}
  >
    {compact ? (
      <>
        <div className={cn(navColumnClassName, "ll:w-11")}>{nav}</div>
        {searchOverlayOpen ? (
          <div className="ll:absolute ll:inset-y-0 ll:start-11 ll:z-30 ll:flex ll:w-54 ll:flex-col ll:gap-3 ll:border-0 ll:border-e ll:border-gray-400/30 ll:bg-gray-900/95 ll:p-1 ll:ps-2 ll:pe-3 ll:shadow-2xl ll:animate-in ll:fade-in-0 ll:slide-in-from-start-2 ll:duration-150">
            {search}
          </div>
        ) : null}
      </>
    ) : (
      <div
        className={cn(
          navColumnClassName,
          "ll:w-44 ll:flex-col ll:gap-3 ll:pe-3",
        )}
      >
        {search}
        <ScrollArea className="ll:min-h-0 ll:flex-1">{nav}</ScrollArea>
      </div>
    )}
    <div className="ll:flex ll:min-h-0 ll:min-w-0 ll:flex-1 ll:flex-col ll:pt-1">
      {subsections}
      <ScrollArea
        className={cn("ll:min-h-0 ll:flex-1", subsections && "ll:mt-2")}
      >
        <div
          className={cn(
            "ll:flex ll:flex-col ll:gap-6 ll:px-4 ll:pb-2",
            subsections ? "ll:pt-4" : "ll:pt-0",
          )}
        >
          {children}
        </div>
      </ScrollArea>
    </div>
  </div>
);
