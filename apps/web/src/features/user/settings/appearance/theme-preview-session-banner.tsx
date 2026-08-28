import { Button } from "@lootlog/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { FlaskConical, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/context/use-theme";

export const ThemePreviewSessionBanner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { previewSession, stopPreviewSession } = useTheme();

  if (!previewSession) return null;

  return (
    <div className="fixed top-3 left-1/2 z-[190] flex w-[min(44rem,calc(100%-1.5rem))] -translate-x-1/2 items-center gap-3 rounded-xl border border-ring bg-popover p-2 pl-3 text-popover-foreground shadow-xl">
      <FlaskConical className="size-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 truncate text-sm">
        {t("settings.appearance.previewSession.active", {
          name: previewSession.name,
        })}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => void navigate({ to: previewSession.returnTo })}
      >
        {t("settings.appearance.previewSession.back")}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-9"
        aria-label={t("settings.appearance.previewSession.end")}
        onClick={stopPreviewSession}
      >
        <X />
      </Button>
    </div>
  );
};
