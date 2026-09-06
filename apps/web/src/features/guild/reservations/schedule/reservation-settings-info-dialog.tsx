import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import {
  CalendarClock,
  Clock3,
  Gauge,
  ListChecks,
  Ruler,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";

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
      icon: Clock3,
      title: t("reservations.schedule.infoDialog.sections.minDuration.title"),
      value: t("reservations.schedule.infoDialog.values.minutes", {
        minutes: settings.reservationMinDurationMinutes,
      }),
      description: t(
        "reservations.schedule.infoDialog.sections.minDuration.description",
      ),
    },
    {
      icon: Gauge,
      title: t("reservations.schedule.infoDialog.sections.maxDuration.title"),
      value: t("reservations.schedule.infoDialog.values.minutes", {
        minutes: settings.reservationMaxDurationMinutes,
      }),
      description: t(
        "reservations.schedule.infoDialog.sections.maxDuration.description",
      ),
    },
    {
      icon: Ruler,
      title: t("reservations.schedule.infoDialog.sections.granularity.title"),
      value: t("reservations.schedule.infoDialog.values.minutes", {
        minutes: settings.reservationTimeGranularityMinutes,
      }),
      description: t(
        "reservations.schedule.infoDialog.sections.granularity.description",
      ),
    },
    {
      icon: CalendarClock,
      title: t("reservations.schedule.infoDialog.sections.maxAdvance.title"),
      value: t("reservations.schedule.infoDialog.values.days", {
        days: settings.reservationMaxAdvanceDays,
      }),
      description: t(
        "reservations.schedule.infoDialog.sections.maxAdvance.description",
      ),
    },
    {
      icon: ListChecks,
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
            <section key={section.title}>
              <SectionCardHeader
                icon={section.icon}
                title={section.title}
                description={section.description}
                actions={
                  <span className="text-xs font-semibold text-muted-foreground">
                    {section.value}
                  </span>
                }
              />
            </section>
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
