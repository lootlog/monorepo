import { DetailPage } from "@/components/common/detail-page";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { cn } from "cn";
import { MetaItem } from "@/components/common/meta-item";
import { SettingsDetailNotFound } from "@/components/common/settings-detail-not-found";
import { ROUTES } from "@/config/routes";
import { useTheme } from "@/hooks/context/use-theme";
import { getCustomThemePreview } from "@/themes/theme-preview";
import { useUserThemesControllerGetSharedTheme } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { useParams } from "@tanstack/react-router";
import { Layers, Link2Off, Save } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCreateTheme } from "./use-create-theme";

/** A theme someone shared by link: previewed at once, saved as a copy. */
export const ThemeImportPage = () => {
  const { t } = useTranslation();
  const { setPreview } = useTheme();
  const { create, isPending } = useCreateTheme();

  const { shareToken } = useParams({
    from: "/_authenticated/@me/settings/appearance_/import/$shareToken",
  });

  const { data: sharedTheme, isError } = useUserThemesControllerGetSharedTheme(
    { shareToken },
    { query: { retry: false } },
  );

  useEffect(() => {
    if (sharedTheme) setPreview(sharedTheme.definition);
  }, [sharedTheme, setPreview]);

  useEffect(() => () => setPreview(null), [setPreview]);

  if (isError) {
    return (
      <SettingsDetailNotFound
        icon={Link2Off}
        title={t("settings.appearance.import.notFound")}
        description={t("settings.appearance.import.notFoundDescription")}
        backTo={ROUTES.user.settings.appearance}
        backLabel={t("settings.appearance.editor.backToList")}
      />
    );
  }

  if (!sharedTheme) return null;

  return (
    <DetailPage
      name={sharedTheme.name}
      media={
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor: getCustomThemePreview(sharedTheme.definition)
              .colors[0],
          }}
        />
      }
      meta={
        <MetaItem icon={Layers}>
          {t("settings.appearance.basedOn", {
            base: t(
              `settings.appearance.themes.${sharedTheme.definition.baseThemeId}.title`,
            ),
          })}
        </MetaItem>
      }
      actions={
        <Button
          size="sm"
          icon=<Save className="size-4" />
          loading={isPending}
          onClick={() => create(sharedTheme.name, sharedTheme.definition)}
        >
          {t("settings.appearance.import.save")}
        </Button>
      }
    >
      <p
        className={cn(
          "py-5 text-sm text-muted-foreground",
          LIST_TILE_INSET_CLASS,
        )}
      >
        {t("settings.appearance.import.description")}
      </p>
    </DetailPage>
  );
};
