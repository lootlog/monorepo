import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Clock3, Hash, History, ListChecks, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

const countBadge = <Skeleton className="h-[22px] w-8 rounded-full" />;

export const NotificationSettingsSkeleton = ({
  showActions = true,
}: {
  /** Reserves the pending-jobs and history cards, which load separately. */
  showActions?: boolean;
}) => {
  const { t } = useTranslation();

  const actionsCard = (
    <SectionCard>
      <SectionCardHeader
        title={t("settings.notifications.sections.actions")}
        icon={Settings}
      />
      <SectionCardContent className="flex flex-col gap-2">
        <Skeleton className="h-9 w-full rounded-xl" />
        <Skeleton className="h-9 w-full rounded-xl" />
      </SectionCardContent>
    </SectionCard>
  );

  return (
    <>
      <div className="lg:hidden">{actionsCard}</div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <SectionCard>
            <SectionCardHeader
              title={t("settings.notifications.sections.targets")}
              icon={Hash}
              description={t(
                "settings.notifications.sections.targetsDescription",
              )}
              actions={countBadge}
            />
            <SectionCardContent className="flex flex-col gap-3">
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            </SectionCardContent>
          </SectionCard>
          <SectionCard>
            <SectionCardHeader
              title={t("settings.notifications.sections.rules")}
              icon={ListChecks}
              description={t(
                "settings.notifications.sections.rulesDescription",
              )}
              actions=<Skeleton className="h-[22px] w-16 rounded-full" />
            />
            <SectionCardContent className="flex flex-col gap-3">
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            </SectionCardContent>
          </SectionCard>
        </div>
        <div className="flex flex-col gap-3">
          <div className="hidden lg:block">{actionsCard}</div>
          {showActions && (
            <>
              <SectionCard>
                <SectionCardHeader
                  title={t("settings.notifications.jobs.pending")}
                  icon={Clock3}
                  description={t(
                    "settings.notifications.sections.jobsDescription",
                  )}
                  actions={countBadge}
                />
                <SectionCardContent>
                  <Skeleton className="h-24 rounded-xl" />
                </SectionCardContent>
              </SectionCard>
              <SectionCard>
                <SectionCardHeader
                  title={t("settings.notifications.jobs.history")}
                  icon={History}
                  description={t(
                    "settings.notifications.sections.historyDescription",
                  )}
                />
                <SectionCardContent>
                  <Skeleton className="h-24 rounded-xl" />
                </SectionCardContent>
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </>
  );
};
