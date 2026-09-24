import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { CalendarClock, Hash, ListChecks, Gauge, Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";

type NotificationsInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const NotificationsInfoDialog = ({
  open,
  onOpenChange,
}: NotificationsInfoDialogProps) => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: Hash,
      title: t("settings.notifications.info.targets.title"),
      description: t("settings.notifications.info.targets.description"),
    },
    {
      icon: ListChecks,
      title: t("settings.notifications.info.rules.title"),
      description: t("settings.notifications.info.rules.description"),
    },
    {
      icon: CalendarClock,
      title: t("settings.notifications.info.scheduling.title"),
      description: t("settings.notifications.info.scheduling.description"),
    },
    {
      icon: Clock3,
      title: t("settings.notifications.info.jobs.title"),
      description: t("settings.notifications.info.jobs.description"),
    },
    {
      icon: Gauge,
      title: t("settings.notifications.info.limits.title"),
      description: t("settings.notifications.info.limits.description"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pb-4 px-1">
          <DialogTitle>{t("settings.notifications.info.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-5 pt-2 pb-5">
          {sections.map((section) => (
            <section key={section.title}>
              <SectionCardHeader
                icon={section.icon}
                title={section.title}
                description={section.description}
              />
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
