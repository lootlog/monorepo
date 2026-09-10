import { SettingsSyncStatus } from "@/components/settings/settings-sync-status";
import {
  SETTINGS_SUBTABS_LIST_CLASS_NAME,
  SETTINGS_SUBTAB_CONTENT_CLASS_NAME,
  SETTINGS_SUBTAB_TRIGGER_CLASS_NAME,
} from "@/components/settings/settings-styles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationCategoryForm } from "@/features/settings/components/notifications/notification-category-form";
import { useGameAccountPreferencesSyncIndicator } from "@/hooks/use-game-account-preferences-sync-status";
import type { NotificationType } from "@lootlog/schema/account-preferences";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type NotificationCategoryTab = {
  label: string;
  key: NotificationType;
};

type NotificationCategoryTabsProps = {
  categories: NotificationCategoryTab[];
};

export const NotificationCategoryTabs: FC<NotificationCategoryTabsProps> = ({
  categories,
}) => {
  const resolvedVisibleStatus = useGameAccountPreferencesSyncIndicator();
  const { t } = useTranslation("common");

  return (
    <Tabs defaultValue={categories[0]?.key} className="ll:w-full ll:gap-3">
      <TabsList className={SETTINGS_SUBTABS_LIST_CLASS_NAME}>
        {categories.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            className={SETTINGS_SUBTAB_TRIGGER_CLASS_NAME}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {categories.map((tab) => (
        <TabsContent
          key={tab.key}
          value={tab.key}
          className={SETTINGS_SUBTAB_CONTENT_CLASS_NAME}
        >
          <div className="ll:relative">
            <div className="ll:sticky ll:top-0 ll:z-10 ll:flex ll:h-0 ll:justify-end ll:pointer-events-none">
              <SettingsSyncStatus
                status={resolvedVisibleStatus}
                errorLabel={t("syncStatus.error")}
                savingLabel={t("syncStatus.saving")}
                syncingLabel={t("syncStatus.syncing")}
              />
            </div>
            <NotificationCategoryForm categoryKey={tab.key} />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
};
