import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import type { ReactNode, Ref } from "react";
import { AppTopBar } from "@/components/layout/app-top-bar";
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
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <SidebarTrigger className="md:hidden" />
          <TopBarHeading heading={heading} titleRef={titleRef} />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <div
            ref={actionsRef}
            className="flex items-center gap-2 empty:hidden"
          />
          {search}
          {/* The context the page shows, such as the selected world. */}
          <div ref={contextRef} className="flex items-center" />
        </div>
      </div>
    </AppTopBar>
  );
};
