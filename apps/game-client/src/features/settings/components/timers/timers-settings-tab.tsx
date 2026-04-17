import {
  SETTINGS_SUBTABS_LIST_CLASS_NAME,
  SETTINGS_SUBTAB_CONTENT_CLASS_NAME,
  SETTINGS_SUBTAB_TRIGGER_CLASS_NAME,
} from "@/components/settings/settings-styles";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FC } from "react";
import { TimersSettingsAppearance } from "@/features/settings/components/timers/timers-settings-appearance";
import { TimersSettingsGeneral } from "@/features/settings/components/timers/timers-settings-general";
import { TimersSettingsColors } from "@/features/settings/components/timers/timers-settings-colors";
import { useTranslation } from "react-i18next";

export const TimersSettingsTab: FC = () => {
  const { t } = useTranslation();

  return (
    <SettingsTabLayout
      title={t("settings.timers.title")}
      description={t("settings.timers.description")}
    >
      <Tabs
        defaultValue="general"
        className="ll:w-full ll:h-full ll:flex ll:flex-col ll:gap-2 ll:pb-4"
      >
        <TabsList className={SETTINGS_SUBTABS_LIST_CLASS_NAME}>
          <TabsTrigger
            value="general"
            className={SETTINGS_SUBTAB_TRIGGER_CLASS_NAME}
          >
            {t("settings.timers.subTabs.general")}
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className={SETTINGS_SUBTAB_TRIGGER_CLASS_NAME}
          >
            {t("settings.timers.subTabs.appearance")}
          </TabsTrigger>
          <TabsTrigger
            value="colors"
            className={SETTINGS_SUBTAB_TRIGGER_CLASS_NAME}
          >
            {t("settings.timers.subTabs.colors")}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="general"
          className={`${SETTINGS_SUBTAB_CONTENT_CLASS_NAME} ll:grow ll:pr-1`}
        >
          <TimersSettingsGeneral />
        </TabsContent>
        <TabsContent
          value="appearance"
          className={`${SETTINGS_SUBTAB_CONTENT_CLASS_NAME} ll:grow ll:pr-1`}
        >
          <TimersSettingsAppearance />
        </TabsContent>
        <TabsContent
          value="colors"
          className={`${SETTINGS_SUBTAB_CONTENT_CLASS_NAME} ll:grow ll:pr-1`}
        >
          <TimersSettingsColors />
        </TabsContent>
      </Tabs>
    </SettingsTabLayout>
  );
};
