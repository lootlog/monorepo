import {
  CalendarClock,
  Clock3,
  Gauge,
  ListChecks,
  Ruler,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";

import type { ReservationSettings } from "./reservation-settings";

type ReservationSettingsInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ReservationSettings;
};

export const ReservationSettingsInfoDialog = ({
  open,
  onOpenChange,
  settings,
}: ReservationSettingsInfoDialogProps) => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: <Clock3 className="size-4 text-emerald-500" />,
      iconBg: "bg-emerald-500/10 shadow-emerald-500/10",
      title: t("reservations.schedule.infoDialog.sections.minDuration.title"),
      value: t("reservations.schedule.infoDialog.values.minutes", {
        minutes: settings.reservationMinDurationMinutes,
      }),
      description: t(
        "reservations.schedule.infoDialog.sections.minDuration.description",
      ),
    },
    {
      icon: <Gauge className="size-4 text-primary" />,
      iconBg: "bg-primary/10 shadow-primary/10",
      title: t("reservations.schedule.infoDialog.sections.maxDuration.title"),
      value: t("reservations.schedule.infoDialog.values.minutes", {
        minutes: settings.reservationMaxDurationMinutes,
      }),
      description: t(
        "reservations.schedule.infoDialog.sections.maxDuration.description",
      ),
    },
    {
      icon: <Ruler className="size-4 text-blue-500" />,
      iconBg: "bg-blue-500/10 shadow-blue-500/10",
      title: t("reservations.schedule.infoDialog.sections.granularity.title"),
      value: t("reservations.schedule.infoDialog.values.minutes", {
        minutes: settings.reservationTimeGranularityMinutes,
      }),
      description: t(
        "reservations.schedule.infoDialog.sections.granularity.description",
      ),
    },
    {
      icon: <CalendarClock className="size-4 text-indigo-500" />,
      iconBg: "bg-indigo-500/10 shadow-indigo-500/10",
      title: t("reservations.schedule.infoDialog.sections.maxAdvance.title"),
      value: t("reservations.schedule.infoDialog.values.days", {
        days: settings.reservationMaxAdvanceDays,
      }),
      description: t(
        "reservations.schedule.infoDialog.sections.maxAdvance.description",
      ),
    },
    {
      icon: <ListChecks className="size-4 text-amber-500" />,
      iconBg: "bg-amber-500/10 shadow-amber-500/10",
      title: t("reservations.schedule.infoDialog.sections.activeLimit.title"),
      value: t("reservations.schedule.infoDialog.values.reservations", {
        count: settings.reservationActiveLimitPerSpot,
      }),
      description: t(
        "reservations.schedule.infoDialog.sections.activeLimit.description",
      ),
    },
  ];

  const failureReasons = [
    "tooShort",
    "tooLong",
    "maxAdvance",
    "activeLimit",
    "overlap",
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pb-4 px-1">
          <DialogTitle>
            {t("reservations.schedule.infoDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("reservations.schedule.infoDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-5 pt-2 pb-5">
          {sections.map((section) => (
            <div key={section.title} className="flex items-start gap-3">
              <div
                className={`shrink-0 rounded-xl p-2.5 shadow-inner ${section.iconBg}`}
              >
                {section.icon}
              </div>
              <div className="pt-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-medium">{section.title}</p>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {section.value}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {section.description}
                </p>
              </div>
            </div>
          ))}

          <div className="mt-1 rounded-md border border-border/70 bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2">
              <ShieldAlert className="size-4 text-destructive" />
              <p className="text-sm font-medium">
                {t("reservations.schedule.infoDialog.failureReasons.title")}
              </p>
            </div>
            <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              {failureReasons.map((reason) => (
                <li key={reason}>
                  {t(
                    `reservations.schedule.infoDialog.failureReasons.items.${reason}`,
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
