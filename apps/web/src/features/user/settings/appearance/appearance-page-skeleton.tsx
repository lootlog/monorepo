import { BandSection } from "@/components/common/band-section";
import { SettingsTabSkeleton } from "@/components/common/settings-tab-skeleton";
import { useTranslation } from "react-i18next";
import { ThemeRowSkeleton } from "./theme-row-skeleton";

export const AppearanceSettingsPageSkeleton = () => {
  const { t } = useTranslation();

  return (
    <SettingsTabSkeleton>
      <BandSection
        id="appearance-custom-themes-skeleton"
        title={t("settings.appearance.customSection.title")}
        tiled
      >
        <ul>
          <ThemeRowSkeleton action />
        </ul>
      </BandSection>
      <BandSection
        id="appearance-built-in-themes-skeleton"
        title={t("settings.appearance.builtInSection.title")}
        tiled
      >
        <ul>
          {Array.from({ length: 8 }, (_, index) => (
            <ThemeRowSkeleton key={index} action />
          ))}
        </ul>
      </BandSection>
    </SettingsTabSkeleton>
  );
};
