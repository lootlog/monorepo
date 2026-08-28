import { Button } from "@lootlog/ui/components/button";
import { PanelLeft, Slash } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ThemePreviewContext } from "./theme-builder-preview-types";

interface ThemePreviewPageHeaderProps {
  context: ThemePreviewContext;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  title: string;
}

export const ThemePreviewPageHeader = ({
  context,
  onToggleSidebar,
  sidebarOpen,
  title,
}: ThemePreviewPageHeaderProps) => {
  const { t } = useTranslation();

  return (
    <header
      data-slot="preview-page-header"
      className="z-10 flex h-14 min-h-14 shrink-0 items-center border-b border-border bg-background px-3"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        aria-label={t(
          sidebarOpen
            ? "settings.appearance.preview.shell.closeNavigation"
            : "settings.appearance.preview.shell.openNavigation",
        )}
        aria-expanded={sidebarOpen}
        onClick={onToggleSidebar}
      >
        <PanelLeft />
      </Button>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden text-sm">
        {context === "guild" ? (
          <>
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">
              {t("settings.appearance.preview.shell.organizationName")}
            </span>
            <Slash className="hidden size-3 text-muted-foreground sm:block" />
          </>
        ) : null}
        <strong className="truncate">{title}</strong>
      </div>
      <div className="size-8 shrink-0" />
    </header>
  );
};
