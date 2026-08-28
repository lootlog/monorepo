import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@lootlog/ui/lib/utils";
import { AppLayoutFrame } from "@/components/layout/app-layout-frame";
import { ThemePreviewGuildNavigation } from "./theme-preview-guild-navigation";
import { ThemePreviewPageHeader } from "./theme-preview-page-header";
import { ThemePreviewUserNavigation } from "./theme-preview-user-navigation";
import { ThemePreviewWorldRail } from "./theme-preview-world-rail";
import type {
  ThemePreviewContext,
  ThemePreviewNavigationKey,
  ThemePreviewViewport,
} from "./theme-builder-preview-types";

interface ThemeBuilderPreviewShellProps {
  activeNavigation: ThemePreviewNavigationKey;
  children: ReactNode;
  context: ThemePreviewContext;
  title: string;
  viewport: ThemePreviewViewport;
}

export const ThemeBuilderPreviewShell = ({
  activeNavigation,
  children,
  context,
  title,
  viewport,
}: ThemeBuilderPreviewShellProps) => {
  const { t } = useTranslation();
  const isDesktop = viewport === "desktop";
  const [isSidebarOpen, setIsSidebarOpen] = useState(isDesktop);

  useEffect(() => {
    setIsSidebarOpen(isDesktop);
  }, [isDesktop]);

  const navigation =
    context === "user" ? (
      <ThemePreviewUserNavigation activeNavigation={activeNavigation} />
    ) : (
      <ThemePreviewGuildNavigation activeNavigation={activeNavigation} />
    );

  return (
    <AppLayoutFrame
      dataSlot="preview-app-shell"
      className="relative flex h-full min-h-0 w-full overflow-hidden bg-background text-foreground"
    >
      {isDesktop && isSidebarOpen ? (
        <aside
          data-slot="preview-sidebar"
          className="flex h-full w-80 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
        >
          <ThemePreviewWorldRail />
          {navigation}
        </aside>
      ) : null}

      {!isDesktop && isSidebarOpen ? (
        <div className="absolute inset-0 z-50 flex" data-slot="preview-sidebar">
          <aside className="flex h-full w-[min(20rem,calc(100%-2.5rem))] border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[12px_0_32px_-18px_var(--theme-shadow)]">
            <ThemePreviewWorldRail />
            {navigation}
          </aside>
          <button
            type="button"
            className="min-w-10 flex-1 cursor-default bg-background"
            aria-label={t("settings.appearance.preview.shell.closeNavigation")}
            onClick={() => setIsSidebarOpen(false)}
          />
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ThemePreviewPageHeader
          context={context}
          title={title}
          sidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        />
        <main
          data-slot="preview-page-content"
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-auto bg-background",
            viewport === "mobile" && "overscroll-contain",
          )}
        >
          {children}
        </main>
      </div>
    </AppLayoutFrame>
  );
};
