import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "cn";
import type { FC, KeyboardEvent, ReactNode } from "react";
import { SETTINGS_DENSITY_STYLE } from "./settings-density";

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
 * Layout for the settings window: navigation column, subsection bar and the
 * scrolling content column, all sized by the settings density tokens.
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
    className="ll:relative ll:flex ll:h-full ll:min-h-0 ll:w-full ll:flex-row ll:text-[length:var(--ll-settings-font-size)]"
    style={SETTINGS_DENSITY_STYLE}
    onKeyDown={onKeyDown}
  >
    {compact ? (
      <>
        {nav}
        {searchOverlayOpen ? (
          <div className="ll:absolute ll:inset-y-0 ll:left-9 ll:z-30 ll:flex ll:w-52 ll:flex-col ll:gap-1 ll:border-solid ll:border-0 ll:border-r ll:border-gray-400/40 ll:bg-gray-900/95 ll:p-1 ll:shadow-2xl">
            {search}
          </div>
        ) : null}
      </>
    ) : (
      <div className="ll:flex ll:h-full ll:min-h-0 ll:w-44 ll:shrink-0 ll:flex-col ll:gap-1 ll:border-solid ll:border-0 ll:border-r ll:border-gray-400/30 ll:bg-black/15 ll:p-1">
        {search}
        <ScrollArea className="ll:min-h-0 ll:flex-1">{nav}</ScrollArea>
      </div>
    )}
    <div className="ll:flex ll:min-h-0 ll:min-w-0 ll:flex-1 ll:flex-col">
      {subsections}
      <ScrollArea
        className={cn(
          "ll:min-h-0 ll:flex-1",
          subsections ? "ll:pt-1" : "ll:pt-0",
        )}
      >
        <div className="ll:flex ll:flex-col ll:gap-[var(--ll-settings-space-lg)] ll:px-1 ll:pb-2">
          {children}
        </div>
      </ScrollArea>
    </div>
  </div>
);
