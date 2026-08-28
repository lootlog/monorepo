import { useState } from "react";
import type { PortableTheme, SpecialThemeId } from "@lootlog/types";
import { Link, useNavigate } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Badge } from "@lootlog/ui/components/badge";
import { Button, buttonVariants } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";
import { Import, Palette, Plus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "@/hooks/context/use-theme";
import { THEME_CATALOG, type ThemePreview } from "@/themes/catalog";
import {
  createPortableTheme,
  encodePortableThemeCode,
  getPortableThemeFileName,
  getUniqueThemeName,
  serializePortableTheme,
} from "@/themes/portable-theme";
import { SpecialThemeDialog } from "./special-theme-dialog";
import { ThemeGalleryCard } from "./theme-gallery-card";
import { ThemeGalleryGrid } from "./theme-gallery-grid";
import { ThemeGallerySection } from "./theme-gallery-section";
import { ThemeImportDialog } from "./theme-import-dialog";

export const AppearanceSettings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { library, selection, setTheme, patchLibrary, isLoading } = useTheme();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [configuredSpecialTheme, setConfiguredSpecialTheme] =
    useState<ThemePreview | null>(null);

  const presetThemes = THEME_CATALOG.filter(
    (theme) => theme.category === "preset",
  );
  const specialThemes = THEME_CATALOG.filter(
    (theme) => theme.category === "special",
  );
  const selectedCustomTheme =
    selection.kind === "custom"
      ? library.customThemes.find((theme) => theme.id === selection.themeId)
      : undefined;
  let activeTitle = t("settings.appearance.themes.default.title");
  if (selectedCustomTheme) {
    activeTitle = selectedCustomTheme.name;
  } else if (selection.kind === "preset") {
    activeTitle = t(`settings.appearance.themes.${selection.presetId}.title`);
  }

  const labels = {
    active: t("settings.appearance.actions.active"),
    activate: t("settings.appearance.actions.activate"),
    preset: t("settings.appearance.badges.preset"),
    custom: t("settings.appearance.badges.custom"),
    special: t("settings.appearance.badges.special"),
    edit: t("settings.appearance.actions.edit"),
    remix: t("settings.appearance.actions.remix"),
    duplicate: t("settings.appearance.actions.duplicate"),
    download: t("settings.appearance.actions.download"),
    copyCode: t("settings.appearance.actions.copyCode"),
    delete: t("settings.appearance.actions.delete"),
    configure: t("settings.appearance.actions.configure"),
    more: t("settings.appearance.actions.more"),
    locked: t("settings.appearance.badges.locked"),
  };

  const activateCustomTheme = async (themeId: string) => {
    const nextSelection = { kind: "custom", themeId } as const;
    try {
      await patchLibrary([{ kind: "select", selection: nextSelection }], {
        optimisticLibrary: { ...library, selection: nextSelection },
      });
    } catch {
      // The provider restores the server state and reports the localized error.
    }
  };

  const duplicateTheme = async (themeId: string) => {
    const source = library.customThemes.find((theme) => theme.id === themeId);
    if (!source) return;
    const duplicate = {
      ...source,
      id: crypto.randomUUID(),
      name: getUniqueThemeName(
        t("settings.appearance.duplicateName", { name: source.name }),
        library.customThemes.map((theme) => theme.name),
      ),
    };
    try {
      await patchLibrary([
        { kind: "upsert", theme: duplicate, activate: false },
      ]);
      toast.success(t("settings.appearance.toasts.duplicated"));
    } catch {
      // The provider reports the mutation error.
    }
  };

  const deleteTheme = async (themeId: string) => {
    if (!window.confirm(t("settings.appearance.deleteConfirm"))) return;
    try {
      await patchLibrary([{ kind: "delete", themeId }]);
      toast.success(t("settings.appearance.toasts.deleted"));
    } catch {
      // The provider reports the mutation error.
    }
  };

  const getPortableCustomTheme = (themeId: string) => {
    const theme = library.customThemes.find(
      (candidate) => candidate.id === themeId,
    );
    return theme ? createPortableTheme(theme.name, theme.config) : null;
  };

  const downloadTheme = (themeId: string) => {
    const portableTheme = getPortableCustomTheme(themeId);
    if (!portableTheme) return;
    const url = URL.createObjectURL(
      new Blob([serializePortableTheme(portableTheme)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = getPortableThemeFileName(portableTheme.name);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyThemeCode = async (themeId: string) => {
    const portableTheme = getPortableCustomTheme(themeId);
    if (!portableTheme) return;
    try {
      await navigator.clipboard.writeText(
        encodePortableThemeCode(portableTheme),
      );
      toast.success(t("settings.appearance.toasts.codeCopied"));
    } catch {
      toast.error(t("settings.appearance.toasts.copyError"));
    }
  };

  const importTheme = async (portableTheme: PortableTheme) => {
    const theme = {
      id: crypto.randomUUID(),
      name: getUniqueThemeName(
        portableTheme.name,
        library.customThemes.map((candidate) => candidate.name),
      ),
      config: portableTheme.config,
    };
    await patchLibrary([{ kind: "upsert", theme, activate: false }]);
    toast.success(t("settings.appearance.toasts.imported"));
    await navigate({
      to: "/@me/settings/appearance/themes/$themeId",
      params: { themeId: theme.id },
    });
  };

  const saveSpecialOverrides = async (
    density: "compact" | "standard" | "comfortable",
    motion: "quiet" | "standard" | "expressive",
  ) => {
    if (!configuredSpecialTheme) return;
    await patchLibrary([
      {
        kind: "set-special-overrides",
        presetId: configuredSpecialTheme.name as SpecialThemeId,
        overrides: { density, motion },
      },
    ]);
    toast.success(t("settings.appearance.toasts.specialUpdated"));
  };

  if (isLoading && library.customThemes.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full w-full">
        <div className="flex w-full flex-col gap-8 px-4 pb-16 pt-2 sm:px-6">
          <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Palette className="size-5" />
                <span className="text-sm font-semibold">
                  {t("settings.appearance.title")}
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("settings.appearance.galleryTitle")}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("settings.appearance.galleryDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsImportOpen(true)}
              >
                <Import />
                {t("settings.appearance.actions.import")}
              </Button>
              <Link
                to="/@me/settings/appearance/themes/new"
                className={cn(buttonVariants())}
              >
                <Plus />
                {t("settings.appearance.actions.create")}
              </Link>
            </div>
          </header>

          <Alert className="border-input-focus bg-surface-selected">
            <Sparkles className="text-primary" />
            <AlertDescription className="flex flex-wrap items-center gap-x-2">
              <span>{t("settings.appearance.activeTheme")}</span>
              <strong className="text-foreground">{activeTitle}</strong>
              <Badge variant="outline">
                {t("settings.appearance.darkOnly")}
              </Badge>
            </AlertDescription>
          </Alert>

          <ThemeGallerySection
            title={t("settings.appearance.sections.mine.title")}
            description={t("settings.appearance.sections.mine.description")}
          >
            {library.customThemes.length > 0 ? (
              <ThemeGalleryGrid>
                {library.customThemes.map((theme) => (
                  <ThemeGalleryCard
                    key={theme.id}
                    title={theme.name}
                    description={t("settings.appearance.customDescription", {
                      recipe: t(
                        `settings.appearance.options.recipe.${theme.config.recipe}`,
                      ),
                      density: t(
                        `settings.appearance.options.density.${theme.config.density}`,
                      ),
                    })}
                    config={theme.config}
                    kind="custom"
                    isActive={
                      selection.kind === "custom" &&
                      selection.themeId === theme.id
                    }
                    onActivate={() => void activateCustomTheme(theme.id)}
                    onEdit={() =>
                      void navigate({
                        to: "/@me/settings/appearance/themes/$themeId",
                        params: { themeId: theme.id },
                      })
                    }
                    onDuplicate={() => void duplicateTheme(theme.id)}
                    onCopyCode={() => void copyThemeCode(theme.id)}
                    onDownload={() => downloadTheme(theme.id)}
                    onDelete={() => void deleteTheme(theme.id)}
                    labels={labels}
                  />
                ))}
              </ThemeGalleryGrid>
            ) : (
              <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center">
                <p className="text-sm font-medium">
                  {t("settings.appearance.emptyMine.title")}
                </p>
                <p className="max-w-md text-xs text-muted-foreground">
                  {t("settings.appearance.emptyMine.description")}
                </p>
              </div>
            )}
          </ThemeGallerySection>

          <ThemeGallerySection
            title={t("settings.appearance.sections.presets.title")}
            description={t("settings.appearance.sections.presets.description")}
          >
            <ThemeGalleryGrid>
              {presetThemes.map((theme) => (
                <ThemeGalleryCard
                  key={theme.name}
                  title={t(`settings.appearance.themes.${theme.name}.title`)}
                  description={t(
                    `settings.appearance.themes.${theme.name}.description`,
                  )}
                  config={theme.config}
                  backgroundImage={theme.backgroundImage}
                  kind="preset"
                  availability={theme.availability}
                  isActive={
                    selection.kind === "preset" &&
                    selection.presetId === theme.name
                  }
                  onActivate={() => setTheme(theme.name)}
                  onRemix={() =>
                    void navigate({
                      to: "/@me/settings/appearance/themes/new",
                      search: { source: theme.name },
                    })
                  }
                  labels={labels}
                />
              ))}
            </ThemeGalleryGrid>
          </ThemeGallerySection>

          <ThemeGallerySection
            title={t("settings.appearance.sections.special.title")}
            description={t("settings.appearance.sections.special.description")}
          >
            <ThemeGalleryGrid>
              {specialThemes.map((theme) => (
                <ThemeGalleryCard
                  key={theme.name}
                  title={t(`settings.appearance.themes.${theme.name}.title`)}
                  description={t(
                    `settings.appearance.themes.${theme.name}.description`,
                  )}
                  config={theme.config}
                  backgroundImage={theme.backgroundImage}
                  kind="special"
                  availability={theme.availability}
                  isActive={
                    selection.kind === "preset" &&
                    selection.presetId === theme.name
                  }
                  onActivate={() => setTheme(theme.name)}
                  onConfigure={() => setConfiguredSpecialTheme(theme)}
                  labels={labels}
                />
              ))}
            </ThemeGalleryGrid>
          </ThemeGallerySection>
        </div>
      </ScrollArea>

      <ThemeImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={importTheme}
      />
      {configuredSpecialTheme ? (
        <SpecialThemeDialog
          title={t(
            `settings.appearance.themes.${configuredSpecialTheme.name}.title`,
          )}
          open
          density={
            library.specialOverrides[
              configuredSpecialTheme.name as SpecialThemeId
            ]?.density ?? configuredSpecialTheme.config.density
          }
          motion={
            library.specialOverrides[
              configuredSpecialTheme.name as SpecialThemeId
            ]?.motion ?? configuredSpecialTheme.config.motion
          }
          onOpenChange={(open) => {
            if (!open) setConfiguredSpecialTheme(null);
          }}
          onSave={saveSpecialOverrides}
        />
      ) : null}
    </>
  );
};
