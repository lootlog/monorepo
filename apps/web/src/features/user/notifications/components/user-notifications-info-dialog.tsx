import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Eye, Gauge, ShieldAlert, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";

type UserNotificationsInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchedItemsLimit: number;
};

const sections = [
  {
    key: "howItWorks",
    icon: Zap,
  },
  {
    key: "limits",
    icon: Gauge,
  },
  {
    key: "scope",
    icon: ShieldAlert,
  },
  {
    key: "quickAdd",
    icon: Eye,
  },
] as const;

export const UserNotificationsInfoDialog = ({
  open,
  onOpenChange,
  watchedItemsLimit,
}: UserNotificationsInfoDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="px-1 pb-4">
          <DialogTitle>
            {t("settings.userNotifications.infoDialog.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-5 pb-5 pt-2">
          {sections.map(({ key, icon: Icon }) => (
            <section key={key}>
              <SectionCardHeader
                icon={Icon}
                title={t(`settings.userNotifications.infoDialog.${key}.title`)}
                description={t(
                  `settings.userNotifications.infoDialog.${key}.description`,
                  { limit: watchedItemsLimit },
                )}
              />
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
