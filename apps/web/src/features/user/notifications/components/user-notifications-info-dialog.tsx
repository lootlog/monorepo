import { Eye, Gauge, ShieldAlert, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
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
    color: "blue",
  },
  {
    key: "limits",
    icon: Gauge,
    color: "amber",
  },
  {
    key: "scope",
    icon: ShieldAlert,
    color: "blue",
  },
  {
    key: "quickAdd",
    icon: Eye,
    color: "green",
  },
] as const;

const colorClasses = {
  blue: "bg-blue-500/10 shadow-blue-500/10 text-blue-500",
  amber: "bg-amber-500/10 shadow-amber-500/10 text-amber-500",
  green: "bg-green-500/10 shadow-green-500/10 text-green-500",
} as const;

export const UserNotificationsInfoDialog = ({
  open,
  onOpenChange,
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
          {sections.map(({ key, icon: Icon, color }) => (
            <div key={key} className="flex items-start gap-3">
              <div
                className={`shrink-0 rounded-xl p-2.5 shadow-inner ${colorClasses[color]}`}
              >
                <Icon className="size-4" />
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-medium">
                  {t(`settings.userNotifications.infoDialog.${key}.title`)}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {t(
                    `settings.userNotifications.infoDialog.${key}.description`,
                    { limit: USER_WATCHED_ITEMS_LIMIT },
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
