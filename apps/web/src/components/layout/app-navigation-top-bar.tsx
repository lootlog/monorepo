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
        {/* Ghost controls at a wide bar's leading edge pull out by their own
            padding, so their glyphs, not their hit areas, line up with the
            page content. Phone controls are glass shapes that line up by
            their edges. */}
        <div className="flex min-w-0 flex-1 items-center gap-1 md:-ml-2">
          <TopBarHeading heading={heading} titleRef={titleRef} />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {/* Pages group their actions with `TopBarItemGroup`. */}
          <div
            ref={actionsRef}
            className="flex items-center gap-2 empty:hidden"
          />
          {search}
          {/* The context the page shows, such as the selected world. */}
          <div ref={contextRef} className="flex items-center empty:hidden" />
        </div>
      </div>
    </AppTopBar>
  );
};
