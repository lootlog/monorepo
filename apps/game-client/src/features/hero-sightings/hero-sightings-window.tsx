import { useTranslation } from "react-i18next";
import { AsyncContent } from "@/components/async-content";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HeroDetectionNotice } from "@/features/hero-sightings/components/hero-detection-notice";
import { HeroSightingsList } from "@/features/hero-sightings/components/hero-sightings-list";
import { projectHeroSightingRows } from "@/features/hero-sightings/hero-sighting-rows";
import { useHeroSightingWriteAccess } from "@/features/hero-sightings/hooks/use-hero-sighting-write-access";
import { useTimersWorld } from "@/features/timers/hooks/use-timers-world";
import { useSession } from "@/hooks/auth/use-session";
import { useHeroSightings } from "@/hooks/api/use-hero-sightings";
import { useHeroSightingsStore } from "@/store/hero-sightings.store";
import { useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";

type HeroSightingsWindowProps = {
  isOpen: boolean;
};

/**
 * Heroes found with detectors in the timers' world. Like the timers, it shows
 * the selected Lootlog, or every Lootlog merged while timer grouping is on.
 */
export const HeroSightingsWindow = ({ isOpen }: HeroSightingsWindowProps) => {
  const { t } = useTranslation("heroSightings");
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { guildId, world } = useTimersWorld();

  const isGrouping = useTimersStore(
    (state) => state.generalConfig.timersGrouping,
  );

  const userId = useSession().data?.user.id;
  const ownDetection = useHeroSightingsStore((state) => state.ownDetection);

  const dismissOwnDetection = useHeroSightingsStore(
    (state) => state.dismissOwnDetection,
  );

  const query = useHeroSightings(world);
  const sightings = query.data ?? [];
  const rows = projectHeroSightingRows(sightings, { guildId, isGrouping });

  const writableGuildIds = useHeroSightingWriteAccess([
    ...new Set([
      ...sightings.map((sighting) => sighting.guildId),
      ...(ownDetection?.sightings.map((sighting) => sighting.guildId) ?? []),
    ]),
  ]);

  return (
    <DraggableWindow
      isOpen={isOpen}
      id="hero-sightings"
      title={t("window.title")}
      onClose={() => {
        setOpen("hero-sightings", false);
        dismissOwnDetection();
      }}
      contentClassName="ll:-mx-1 ll:-mb-1"
      resizable
      minHeight={82}
      minWidth={242}
    >
      <div className="ll:flex ll:h-full ll:flex-col">
        {ownDetection ? (
          <HeroDetectionNotice
            detection={ownDetection}
            sightings={sightings}
            userId={userId}
            writableGuildIds={writableGuildIds}
            onDismiss={dismissOwnDetection}
          />
        ) : null}
        <ScrollArea className="ll:flex-1">
          <AsyncContent
            error={query.data ? null : query.error}
            errorLabel={t("states.loadError")}
            isLoading={query.data === undefined && !query.error}
            loadingLabel={t("states.loading")}
            onRetry={() => void query.refetch()}
            retryLabel={t("actions.retry", { ns: "common" })}
          >
            <HeroSightingsList
              rows={rows}
              userId={userId}
              writableGuildIds={writableGuildIds}
            />
          </AsyncContent>
        </ScrollArea>
      </div>
    </DraggableWindow>
  );
};
