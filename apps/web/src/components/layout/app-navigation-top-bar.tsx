import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import type { ReactNode, Ref } from "react";
import { AppTopBar } from "@lootlog/ui/components/app-top-bar";
import { TopBarHeading } from "@/components/layout/top-bar-heading";
import type { AppNavigationHeading } from "@/navigation/app-navigation";

type AppNavigationTopBarProps = {
  heading: AppNavigationHeading;
  titleRef: Ref<HTMLDivElement>;
  actionsRef: Ref<HTMLDivElement>;
  contextRef: Ref<HTMLDivElement>;
  /** Shell-owned search, always between the page's actions and its context. */
  search?: ReactNode;
};

export const AppNavigationTopBar = ({
  heading,
  titleRef,
  actionsRef,
  contextRef,
  search,
}: AppNavigationTopBarProps) => {
  return (
    <AppTopBar>
      <div className="flex w-full min-w-0 items-center gap-2">
        {/* Ghost controls at the bar's edges pull out by their own padding, so
            their glyphs, not their hit areas, line up with the page content. */}
        <div className="-ml-2 flex min-w-0 flex-1 items-center gap-1">
          <SidebarTrigger className="md:hidden" />
          <TopBarHeading heading={heading} titleRef={titleRef} />
        </div>

        {/* Phone bars drop control borders: an icon button's glyph sits 10px in,
            the world switcher's text-sized padding 2px more. */}
        <div className="flex shrink-0 items-center justify-end gap-2 max-md:-mr-2.5">
          <div
            ref={actionsRef}
            className="flex items-center gap-2 empty:hidden"
          />
          {search}
          {/* The context the page shows, such as the selected world. */}
          <div
            ref={contextRef}
            className="flex items-center empty:hidden max-md:-mr-0.5"
          />
        </div>
      </div>
    </AppTopBar>
  );
};
