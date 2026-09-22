import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Eye, Gauge, ShieldAlert, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { USER_WATCHED_ITEMS_LIMIT } from "../constants/user-watched-items-limit";

type UserNotificationsInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}: UserNotificationsInfoDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("settings.userNotifications.infoDialog.title")}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4 overflow-y-auto">
          {sections.map(({ key, icon: Icon }) => (
            <section key={key}>
              <SectionCardHeader
                icon={Icon}
                title={t(`settings.userNotifications.infoDialog.${key}.title`)}
                description={t(
                  `settings.userNotifications.infoDialog.${key}.description`,
                  { limit: USER_WATCHED_ITEMS_LIMIT },
                )}
              />
            </section>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
