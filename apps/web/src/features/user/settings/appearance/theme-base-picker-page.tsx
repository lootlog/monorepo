import { BandSection } from "@/components/common/band-section";
import { DetailPage } from "@/components/common/detail-page";
import { MetaItem } from "@/components/common/meta-item";
import { useUserThemes } from "@/hooks/api/user/use-user-themes";
import { THEME_CATALOG } from "@lootlog/ui/themes/catalog";
import {
  createDefinitionFromBase,
  customThemeStyle,
} from "@lootlog/ui/themes/custom-theme";
import { getBuiltInThemePreview } from "@/themes/theme-preview";
import { CUSTOM_THEME_LIMIT } from "@lootlog/schema/custom-theme";
import { Dices, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import { randomizeCustomTheme } from "@lootlog/domain/custom-theme";
import { Button } from "@lootlog/ui/components/button";
import { sample } from "es-toolkit";
import { WALLPAPERS } from "@lootlog/ui/themes/wallpapers";
import { ThemeRow } from "./theme-row";
import { previewThemeClass } from "@lootlog/ui/themes/resolver";
import { useCreateTheme } from "./use-create-theme";

/** A random theme starts from one fixed palette, not the cat roulette. */
const RANDOM_BASES = THEME_CATALOG.map(({ name }) => name).filter(
  (name) => name !== "cat-random",
);

/** The first step of a new theme: the built-in theme it starts from. */
export const ThemeBasePickerPage = () => {
  const { t } = useTranslation();
  const { data: userThemes } = useUserThemes();
  const { create, isPending } = useCreateTheme();

  const themeTitle = (themeId: string) =>
    t(`settings.appearance.themes.${themeId}.title`);

  return (
    <DetailPage
      name={t("settings.appearance.create.title")}
      meta={
        <MetaItem icon={Palette}>
          {t("settings.appearance.customSection.title")}{" "}
          {`${userThemes?.length ?? 0}/${CUSTOM_THEME_LIMIT}`}
        </MetaItem>
      }
    >
      <BandSection
        id="appearance-new-theme-random"
        title={t("settings.appearance.create.randomTitle")}
        description={t("settings.appearance.create.randomDescription")}
      >
        <div>
          <Button
            variant="outline"
            icon=<Dices className="size-4" />
            loading={isPending}
            onClick={() => {
              const theme = randomizeCustomTheme({
                baseThemeId: sample(RANDOM_BASES),
                wallpapers: WALLPAPERS.map(({ id }) => id),
              });

              create(t("settings.appearance.create.randomName"), theme);
            }}
          >
            {t("settings.appearance.create.randomAction")}
          </Button>
        </div>
      </BandSection>

      <BandSection
        id="appearance-new-theme-base"
        title={t("settings.appearance.create.sectionTitle")}
        description={t("settings.appearance.create.description")}
        tiled
      >
        <ul aria-busy={isPending}>
          {THEME_CATALOG.map(({ name }) => (
            <ThemeRow
              key={name}
              title={themeTitle(name)}
              description={t(`settings.appearance.themes.${name}.description`)}
              preview={getBuiltInThemePreview(name)}
              themeClass={previewThemeClass(name)}
              themeStyle={customThemeStyle(createDefinitionFromBase(name))}
              onSelect={() => {
                if (isPending) return;

                create(
                  t("settings.appearance.copyName", { name: themeTitle(name) }),
                  createDefinitionFromBase(name),
                );
              }}
            />
          ))}
        </ul>
      </BandSection>
    </DetailPage>
  );
};
