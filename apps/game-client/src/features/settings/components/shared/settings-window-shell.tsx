import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "cn";
import type { FC, KeyboardEvent, ReactNode } from "react";

type SettingsWindowShellProps = {
  compact: boolean;
  nav: ReactNode;
  search: ReactNode;
  searchOverlayOpen: boolean;
  searchExpanded: boolean;
  subsections?: ReactNode;
  children: ReactNode;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

const navColumnClassName =
  "ll:flex ll:min-h-0 ll:shrink-0 ll:border-0 ll:border-e ll:border-solid ll:border-border ll:mt-1 ll:mb-2 ll:pt-0.5 ll:pb-1 ll:ps-2";

export const SettingsWindowShell: FC<SettingsWindowShellProps> = ({
  compact,
  nav,
  search,
  searchOverlayOpen,
  searchExpanded,
  subsections,
  children,
  onKeyDown,
}) => (
  <div
    className="ll:relative ll:flex ll:h-full ll:min-h-0 ll:w-full ll:flex-row ll:text-[13px]"
    onKeyDown={onKeyDown}
  >
    {compact ? (
      <>
        <div className={cn(navColumnClassName, "ll:w-11")}>{nav}</div>
        {searchOverlayOpen ? (
          <div className="ll:absolute ll:inset-y-0 ll:start-11 ll:z-30 ll:flex ll:w-64 ll:flex-col ll:gap-3 ll:border-0 ll:border-e ll:border-solid ll:border-border ll:bg-black/90 ll:p-1 ll:ps-2 ll:pe-3 ll:animate-in ll:fade-in-0 ll:duration-150">
            {search}
          </div>
        ) : null}
      </>
    ) : (
      <div className={cn(navColumnClassName, "ll:w-52 ll:flex-col ll:gap-3")}>
        <div
          className={cn(
            "ll:flex ll:flex-col ll:pe-3",
            searchExpanded && "ll:min-h-0 ll:flex-1",
          )}
        >
          {search}
        </div>
        {searchExpanded ? null : (
          <ScrollArea className="ll:min-h-0 ll:flex-1">{nav}</ScrollArea>
        )}
      </div>
    )}
    <div className="ll:flex ll:min-h-0 ll:min-w-0 ll:flex-1 ll:flex-col ll:pt-1.5">
      {subsections}
      <ScrollArea
        className={cn(
          "ll:min-h-0 ll:flex-1",
          subsections ? "ll:mt-3" : "ll:mt-1",
        )}
      >
        <div className="ll:@container/settings ll:flex ll:flex-col ll:gap-6 ll:px-4 ll:pt-1 ll:pb-2">
          {children}
        </div>
      </ScrollArea>
    </div>
  </div>
);
