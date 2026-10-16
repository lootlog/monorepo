import { BandSection } from "@/components/common/band-section";
import { ListTileEmpty } from "@/components/common/list-tile-empty";
import { SettingsTabPage } from "@/components/common/settings-tab-page";
import { ROUTES } from "@/config/routes";
import { useUserThemes } from "@/hooks/api/user/use-user-themes";
import { useTheme } from "@/hooks/context/use-theme";
import { THEME_CATALOG } from "@/themes/catalog";
import {
  createDefinitionFromBase,
  customThemeStyle,
  loadCustomThemeFont,
  toCustomThemePreference,
} from "@/themes/custom-theme";
import { isThemeId, previewThemeClass } from "@/themes/resolver";
import {
  getBuiltInThemePreview,
  getCustomThemePreview,
} from "@/themes/theme-preview";
import { CUSTOM_THEME_LIMIT } from "@lootlog/schema/custom-theme";
import { Button } from "@lootlog/ui/components/button";
import { Link, useSearch } from "@tanstack/react-router";
import { cn } from "cn";
import {
  Download,
  Palette,
  Pencil,
  Plus,
  Share2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useEffectEvent, type FC } from "react";
import { useTranslation } from "react-i18next";
import { DeleteThemeDialog } from "./delete-theme-dialog";
import { ImportThemeDialog } from "./import-theme-dialog";
import { ShareThemeDialog } from "./share-theme-dialog";
import { ThemeRow } from "./theme-row";
import { ThemeRowSkeleton } from "./theme-row-skeleton";
import { useCreateTheme } from "./use-create-theme";

export const AppearanceSettings: FC = () => {
  const { t } = useTranslation();
  const { selection, setTheme } = useTheme();
  const { data: userThemes, isPending } = useUserThemes();
  const { create, isPending: isCreating } = useCreateTheme();

  const { theme: themeParam } = useSearch({
    from: "/_authenticated/@me/settings/appearance",
  });

  const applyThemeParam = useEffectEvent(() => {
    if (themeParam && isThemeId(themeParam) && themeParam !== selection) {
      setTheme(themeParam);
    }
  });

  useEffect(() => {
    applyThemeParam();
  }, [themeParam]);

  const themeCount = userThemes?.length ?? 0;
  const canCreate = !isPending && themeCount < CUSTOM_THEME_LIMIT;
  const createLabel = t("settings.appearance.customSection.create");
  const importLabel = t("settings.appearance.import.action");
  const inUseLabel = t("settings.appearance.actions.inUse");
  const sharedLabel = t("settings.appearance.actions.shared");

  // Each custom theme's row shows its own font.
  useEffect(() => {
    for (const userTheme of userThemes ?? []) {
      loadCustomThemeFont(userTheme.definition);
    }
  }, [userThemes]);

  const themeTitle = (themeId: string) =>
    t(`settings.appearance.themes.${themeId}.title`);

  return (
    <SettingsTabPage title={t("settings.appearance.title")}>
      <BandSection
        id="appearance-custom-themes"
        title={t("settings.appearance.customSection.title")}
        count={`${themeCount}/${CUSTOM_THEME_LIMIT}`}
        tiled
        trailing={
          // On phones the buttons keep only their icons, so the title fits.
          <span className="flex items-center gap-1.5">
            <ImportThemeDialog
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canCreate}
                  icon=<Download className="size-4" />
                  aria-label={importLabel}
                >
                  <span className="max-sm:sr-only">{importLabel}</span>
                </Button>
              }
            />
            <Button
              size="sm"
              className="max-sm:hidden"
              disabled={!canCreate}
              icon=<Plus className="size-4" />
              nativeButton={false}
              render={<Link to={ROUTES.user.settings.newTheme} />}
            >
              {createLabel}
            </Button>
            <Button
              size="icon-sm"
              className="sm:hidden"
              disabled={!canCreate}
              aria-label={createLabel}
              nativeButton={false}
              render={<Link to={ROUTES.user.settings.newTheme} />}
            >
              <Plus className="size-4" />
            </Button>
          </span>
        }
      >
        {isPending ? (
          <ul aria-hidden>
            <ThemeRowSkeleton action />
          </ul>
        ) : themeCount > 0 ? (
          <ul>
            {userThemes?.map((userTheme) => (
              <ThemeRow
                key={userTheme.id}
                title={userTheme.name}
                description={t("settings.appearance.basedOn", {
                  base: themeTitle(userTheme.definition.baseThemeId),
                })}
                preview={getCustomThemePreview(userTheme.definition)}
                themeClass={previewThemeClass(userTheme.definition.baseThemeId)}
                themeStyle={customThemeStyle(userTheme.definition)}
                activeLabel={inUseLabel}
                sharedLabel={userTheme.shareToken ? sharedLabel : undefined}
                isActive={selection === toCustomThemePreference(userTheme.id)}
                onSelect={() => setTheme(toCustomThemePreference(userTheme.id))}
                action={
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("settings.appearance.actions.editLabel", {
                        name: userTheme.name,
                      })}
                      nativeButton={false}
                      render={
                        <Link to={ROUTES.user.settings.theme(userTheme.id)} />
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <ShareThemeDialog
                      theme={userTheme}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t(
                            userTheme.shareToken
                              ? "settings.appearance.actions.sharedLabel"
                              : "settings.appearance.actions.shareLabel",
                            { name: userTheme.name },
                          )}
                          // A live link is a state worth noticing, so a
                          // shared theme's button takes the accent.
                          className={cn(
                            userTheme.shareToken &&
                              "text-primary hover:text-primary",
                          )}
                        >
                          <Share2 className="size-4" />
                        </Button>
                      }
                    />
                    <DeleteThemeDialog
                      theme={userTheme}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t(
                            "settings.appearance.actions.deleteLabel",
                            { name: userTheme.name },
                          )}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  </>
                }
              />
            ))}
          </ul>
        ) : (
          <ListTileEmpty icon={Palette}>
            {t("settings.appearance.customSection.empty")}
          </ListTileEmpty>
        )}
      </BandSection>

      <BandSection
        id="appearance-built-in-themes"
        title={t("settings.appearance.builtInSection.title")}
        tiled
      >
        <ul>
          {THEME_CATALOG.map(({ name }) => (
            <ThemeRow
              key={name}
              title={themeTitle(name)}
              description={t(`settings.appearance.themes.${name}.description`)}
              preview={getBuiltInThemePreview(name)}
              themeClass={previewThemeClass(name)}
              themeStyle={customThemeStyle(createDefinitionFromBase(name))}
              activeLabel={inUseLabel}
              isActive={selection === name}
              onSelect={() => setTheme(name)}
              action={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={!canCreate || isCreating}
                  aria-label={t("settings.appearance.actions.customizeLabel", {
                    name: themeTitle(name),
                  })}
                  onClick={() =>
                    create(
                      t("settings.appearance.copyName", {
                        name: themeTitle(name),
                      }),
                      createDefinitionFromBase(name),
                    )
                  }
                >
                  <SlidersHorizontal className="size-4" />
                </Button>
              }
            />
          ))}
        </ul>
      </BandSection>
    </SettingsTabPage>
  );
};
