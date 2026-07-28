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
      icon: <Hash className="size-4 text-indigo-500" />,
      iconBg: "bg-indigo-500/10",
      title: t("settings.notifications.info.targets.title"),
      description: t("settings.notifications.info.targets.description"),
    },
    {
      icon: <ListChecks className="size-4 text-emerald-500" />,
      iconBg: "bg-emerald-500/10",
      title: t("settings.notifications.info.rules.title"),
      description: t("settings.notifications.info.rules.description"),
    },
    {
      icon: <CalendarClock className="size-4 text-blue-500" />,
      iconBg: "bg-blue-500/10",
      title: t("settings.notifications.info.scheduling.title"),
      description: t("settings.notifications.info.scheduling.description"),
    },
    {
      icon: <Clock3 className="size-4 text-primary" />,
      iconBg: "bg-primary/10",
      title: t("settings.notifications.info.jobs.title"),
      description: t("settings.notifications.info.jobs.description"),
    },
    {
      icon: <Gauge className="size-4 text-amber-500" />,
      iconBg: "bg-amber-500/10",
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
            <div key={section.title} className="flex items-start gap-3">
              <div className={`shrink-0 rounded-xl p-2.5  ${section.iconBg}`}>
                {section.icon}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-medium">{section.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {section.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
