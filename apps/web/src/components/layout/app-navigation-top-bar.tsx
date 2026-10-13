import { Button } from "@lootlog/ui/components/button";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import { AppTopBar } from "@/components/layout/app-top-bar";
import type { AppNavigationHeading } from "@/navigation/app-navigation";

type AppNavigationTopBarProps = {
  heading: AppNavigationHeading;
  actionsRef: Ref<HTMLDivElement>;
  contextRef: Ref<HTMLDivElement>;
};

export const AppNavigationTopBar = ({
  heading,
  actionsRef,
  contextRef,
}: AppNavigationTopBarProps) => {
  const { t } = useTranslation();
  const { title, parent } = heading;

  return (
    <AppTopBar>
      <div className="flex w-full min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SidebarTrigger className="md:hidden" />

          {parent && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link to={parent.path} />}
              aria-label={t("common.actions.backTo", { page: parent.label })}
              // Phones keep the arrow; the title next to it is the context.
              className="w-8 shrink-0 px-0 text-muted-foreground hover:text-foreground md:w-auto md:max-w-48 md:pr-3 md:pl-2"
            >
              <ChevronLeft aria-hidden="true" />
              <span className="hidden truncate md:inline">{parent.label}</span>
            </Button>
          )}

          <span className="min-w-0 truncate text-base font-semibold">
            {title}
          </span>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <div ref={actionsRef} className="flex items-center gap-2" />
          {/* The context the page shows, such as the selected world. */}
          <div ref={contextRef} className="flex items-center" />
        </div>
      </div>
    </AppTopBar>
  );
};
