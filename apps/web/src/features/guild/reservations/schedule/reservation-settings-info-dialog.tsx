import {
  CalendarClock,
  Clock3,
  Gauge,
  Info,
  ListChecks,
  Ruler,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";

type ReservationSettingsInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ReservationSettings;
};

const failureReasons = [
  "tooShort",
  "tooLong",
  "maxAdvance",
  "activeLimit",
  "overlap",
] as const;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl">
        <IconDialogHeader
          icon={Info}
          title={t("reservations.schedule.infoDialog.title")}
          description={t("reservations.schedule.infoDialog.description")}
        />
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
          {/* Laid out as the reservation's own details are. */}
          <dl className="-mt-3 divide-y text-sm">
            {sections.map(({ icon: Icon, title, value, description }) => (
              <div
                key={title}
                className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 py-3"
              >
                <Icon aria-hidden className="mt-0.5 size-4 text-primary" />
                <dt className="font-medium">{title}</dt>
                <dd className="font-semibold tabular-nums">{value}</dd>
                <dd className="col-span-2 col-start-2 text-xs text-muted-foreground">
                  {description}
                </dd>
              </div>
            ))}
          </dl>

          <div className="rounded-md border border-border/70 bg-muted/30 p-3">
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
