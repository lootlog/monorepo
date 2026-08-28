import { Button } from "@lootlog/ui/components/button";
import { cn } from "@lootlog/ui/lib/utils";
import { CirclePlus, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const WORLD_KEYS = ["aether", "north", "ember", "frost", "void"] as const;

export const ThemePreviewWorldRail = () => {
  const { t } = useTranslation();
  const [activeWorld, setActiveWorld] =
    useState<(typeof WORLD_KEYS)[number]>("aether");

  return (
    <div
      data-slot="preview-world-rail"
      className="flex h-full w-16 shrink-0 flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar py-2"
    >
      <button
        type="button"
        className="grid size-11 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground outline-none ring-offset-2 ring-offset-sidebar focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-label={t("settings.appearance.preview.shell.personalWorkspace")}
      >
        {t("settings.appearance.preview.shell.brandInitials")}
      </button>
      <div className="h-px w-8 bg-sidebar-border" />
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
        {WORLD_KEYS.map((world, index) => (
          <button
            key={world}
            type="button"
            className={cn(
              "relative grid size-11 shrink-0 place-items-center rounded-xl border border-sidebar-border bg-secondary text-xs font-semibold text-secondary-foreground outline-none transition-colors hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              activeWorld === world &&
                "border-sidebar-primary bg-sidebar-active text-sidebar-primary-foreground",
            )}
            aria-label={t(`settings.appearance.preview.shell.worlds.${world}`)}
            aria-pressed={activeWorld === world}
            onClick={() => setActiveWorld(world)}
          >
            {t(`settings.appearance.preview.shell.worldInitials.${world}`)}
            {index === 1 ? (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-[9px] leading-4 text-primary-foreground">
                3
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-11 text-sidebar-foreground hover:bg-sidebar-hover"
        aria-label={t("settings.appearance.preview.shell.addOrganization")}
      >
        <CirclePlus />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-11 text-sidebar-foreground hover:bg-sidebar-hover"
        aria-label={t("settings.appearance.preview.shell.applications")}
      >
        <LayoutGrid />
      </Button>
    </div>
  );
};
