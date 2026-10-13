import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { BellRing, MessageCircleMore } from "lucide-react";
import { useTranslation } from "react-i18next";

export const UserNotificationsPageSkeleton = () => {
  const { t } = useTranslation();

  // Like the loaded page, the direct message card leads on narrow screens and
  // sits in the side column on wide ones.
  const dmCard = (
    <SectionCard>
      <SectionCardHeader
        icon={MessageCircleMore}
        title={t("settings.userNotifications.dm.title")}
        actions={<Skeleton className="ml-auto h-[22px] w-24 rounded-full" />}
      />
      <SectionCardContent>
        <div className="space-y-2">
          <Skeleton className="h-9 rounded-md" />
          <Skeleton className="h-9 rounded-md" />
        </div>
      </SectionCardContent>
    </SectionCard>
  );

  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-3 px-3 py-3">
        <PageHeader
          icon={BellRing}
          title={t("settings.userNotifications.title")}
          description={t("settings.userNotifications.description")}
          actions={<Skeleton className="size-9 rounded-md" />}
        />

        <div className="lg:hidden">{dmCard}</div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <SectionCard>
              <SectionCardHeader
                icon={BellRing}
                title={t("settings.userNotifications.watchList.title")}
                description={t(
                  "settings.userNotifications.watchList.description",
                )}
                actions={
                  <Skeleton className="ml-auto h-[22px] w-14 rounded-full" />
                }
              />
              <SectionCardContent>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              </SectionCardContent>
            </SectionCard>
          </div>
          <div className="space-y-3">
            <div className="hidden lg:block">{dmCard}</div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
