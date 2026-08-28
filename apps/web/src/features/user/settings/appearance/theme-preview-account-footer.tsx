import { Avatar, AvatarFallback } from "@lootlog/ui/components/avatar";
import { ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export const ThemePreviewAccountFooter = () => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      data-slot="preview-account-footer"
      className="flex h-14 w-full items-center gap-2.5 border-t border-sidebar-border pl-2 text-left outline-none transition-colors hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
    >
      <Avatar className="size-8 rounded-full ring-1 ring-sidebar-border">
        <AvatarFallback>
          {t("settings.appearance.preview.shell.userInitials")}
        </AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11px] font-medium leading-none text-muted-foreground">
          {t("layout.userMenu.account")}
        </span>
        <span className="truncate text-sm font-bold leading-none">
          {t("settings.appearance.preview.shell.userName")}
        </span>
      </span>
      <span className="flex h-8 w-12 shrink-0 items-center justify-center border-l border-sidebar-border text-muted-foreground">
        <ChevronUp className="size-4" />
      </span>
    </button>
  );
};
