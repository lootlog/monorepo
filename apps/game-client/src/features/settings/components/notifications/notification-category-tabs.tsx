import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationCategoryForm } from "@/features/settings/components/notifications/notification-category-form";
import type { NotificationType } from "@lootlog/schema/account-preferences";
import type { FC } from "react";

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
  return (
    <Tabs defaultValue={categories[0]?.key} className="ll:w-full ll:gap-3">
      <TabsList className="ll:w-full">
        {categories.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {categories.map((tab) => (
        <TabsContent key={tab.key} value={tab.key}>
          <div className="ll:relative">
            <NotificationCategoryForm categoryKey={tab.key} />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
};
