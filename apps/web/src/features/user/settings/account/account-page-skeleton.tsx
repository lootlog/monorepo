import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { LogOut, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const AccountSettingsPageSkeleton = () => {
  const { t } = useTranslation();

  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-3 p-3">
        <SectionCard>
          <SectionCardHeader
            icon={LogOut}
            title={t("settings.account.session.title")}
            description={t("settings.account.session.description")}
          />
          <SectionCardContent>
            <Skeleton className="h-9 w-full rounded-md sm:w-32" />
          </SectionCardContent>
        </SectionCard>

        <SectionCard>
          <SectionCardHeader
            icon={Trash2}
            title={t("settings.account.dangerZone.title")}
            description={t("settings.account.dangerZone.description")}
          />
          <SectionCardContent>
            <Skeleton className="h-9 w-full rounded-md sm:w-32" />
          </SectionCardContent>
        </SectionCard>
      </div>
    </ScrollArea>
  );
};
