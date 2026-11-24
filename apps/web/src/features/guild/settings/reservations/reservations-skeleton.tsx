import { BandSection } from "@/components/common/band-section";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Hourglass, Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsTabSkeleton } from "@/components/common/settings-tab-skeleton";
import { ReservationShareGroup } from "./reservation-share-group";

const FORM_SECTIONS = [
  ["duration", ["minDuration", "maxDuration"]],
  ["schedule", ["granularity", "maxAdvance"]],
  ["limits", ["activeLimit"]],
] as const;

export const ReservationsSettingsSkeleton = () => {
  const { t, i18n } = useTranslation();

  return (
    <SettingsTabSkeleton>
      <div className="pb-24">
        {FORM_SECTIONS.map(([section, fields]) => (
          <BandSection
            key={section}
            id={`reservation-settings-${section}-skeleton`}
            title={t(`settings.reservations.${section}.title`)}
            description={
              i18n.exists(`settings.reservations.${section}.description`)
                ? t(`settings.reservations.${section}.description`)
                : undefined
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <div key={field} className="grid gap-2">
                  <span className="text-sm leading-none font-medium">
                    {t(`settings.reservations.fields.${field}.label`)}
                  </span>
                  <Skeleton className="h-9 w-full rounded-lg" />
                  {i18n.exists(
                    `settings.reservations.fields.${field}.description`,
                  ) ? (
                    <p className="text-sm text-muted-foreground">
                      {t(`settings.reservations.fields.${field}.description`)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </BandSection>
        ))}
        <BandSection
          id="reservation-sharing-skeleton"
          title={t("settings.reservations.sharing.title")}
          description={t("settings.reservations.sharing.description")}
          tiled
          trailing=<Skeleton className="h-8 w-44 rounded-lg" />
        >
          <ReservationShareGroup
            id="reservation-partners-skeleton"
            title={t("settings.reservations.sharing.partners")}
            count={undefined}
            isPending
            emptyLabel=""
            emptyIcon={Link2}
          >
            {null}
          </ReservationShareGroup>
          <ReservationShareGroup
            id="reservation-invitations-skeleton"
            title={t("settings.reservations.sharing.pending")}
            count={undefined}
            isPending
            emptyLabel=""
            emptyIcon={Hourglass}
          >
            {null}
          </ReservationShareGroup>
        </BandSection>
      </div>
    </SettingsTabSkeleton>
  );
};
