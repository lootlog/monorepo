import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import type { LucideIcon } from "lucide-react";
import type { Ref } from "react";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { AppTopBar } from "@/components/layout/app-top-bar";
import type { AppNavigation } from "@/navigation/app-navigation";
import { TopBarBackButton } from "./top-bar-back-button";

type AppNavigationTopBarProps = {
  breadcrumbs: AppNavigation["breadcrumbs"];
  parentPath: string | null;
  sectionIcon?: LucideIcon;
  contextRef: Ref<HTMLDivElement>;
  actionsRef: Ref<HTMLDivElement>;
};

export const AppNavigationTopBar = ({
  breadcrumbs,
  parentPath,
  sectionIcon,
  contextRef,
  actionsRef,
}: AppNavigationTopBarProps) => (
  <AppTopBar>
    <div className="flex w-full min-w-0 items-center gap-2">
      {/* Desktop breadcrumbs already link to the parent page; phones show
          only the current page, so they keep the menu and back buttons. */}
      <div className="flex shrink-0 items-center gap-1 md:hidden">
        <SidebarTrigger />
        {parentPath && <TopBarBackButton to={parentPath} />}
      </div>

      <AppBreadcrumbs breadcrumbs={breadcrumbs} sectionIcon={sectionIcon} />

      {/* Page context that qualifies the title, such as the selected world. */}
      <div ref={contextRef} className="flex shrink-0 items-center gap-1" />

      <div
        ref={actionsRef}
        className="ml-auto flex shrink-0 items-center justify-end gap-2"
      />
    </div>
  </AppTopBar>
);
