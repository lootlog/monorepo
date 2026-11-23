import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AsyncContent } from "@/components/async-content";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { IconButton } from "@/components/ui/icon-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddHeroSightingPanel } from "@/features/hero-sightings/components/add-hero-sighting-panel";
import { HeroDetectionNotice } from "@/features/hero-sightings/components/hero-detection-notice";
import { HeroSightingsList } from "@/features/hero-sightings/components/hero-sightings-list";
import { useHeroSightingMemberColors } from "@/features/hero-sightings/hooks/use-hero-sighting-member-colors";
import { useHeroSightingRows } from "@/features/hero-sightings/hooks/use-hero-sighting-rows";
import { useHeroSightingWriteAccess } from "@/features/hero-sightings/hooks/use-hero-sighting-write-access";
import { useTimersWorld } from "@/features/timers/hooks/use-timers-world";
import { useSession } from "@/hooks/auth/use-session";
import { useNoticePresence } from "@/hooks/ui/use-notice-presence";
import { useHeroSightingsStore } from "@/store/hero-sightings.store";
import { useWindowsStore } from "@/store/windows.store";

type HeroSightingsWindowProps = {
  isOpen: boolean;
};

export const HeroSightingsWindow = ({ isOpen }: HeroSightingsWindowProps) => {
  const { t } = useTranslation("heroSightings");
  const setOpen = useWindowsStore((state) => state.setOpen);
  const userId = useSession().data?.user.id;
  const ownDetection = useHeroSightingsStore((state) => state.ownDetection);

  const dismissOwnDetection = useHeroSightingsStore(
    (state) => state.dismissOwnDetection,
  );

  const [mountedDetection] = useState(ownDetection);
  const [shownDetection, setShownDetection] = useState(ownDetection);

  if (ownDetection && ownDetection !== shownDetection) {
    setShownDetection(ownDetection);
  }

  const detectionNotice = useNoticePresence(ownDetection !== null, {
    minVisibleMs: 0,
  });

  const { query, sightings, rows } = useHeroSightingRows();
  const { world } = useTimersWorld();
  const [addOpen, setAddOpen] = useState(false);

  const relevantGuildIds = [
    ...new Set([
      ...sightings.map((sighting) => sighting.guildId),
      ...(ownDetection?.sightings.map((sighting) => sighting.guildId) ?? []),
    ]),
  ];

  const writableGuildIds = useHeroSightingWriteAccess(relevantGuildIds);
  const memberColors = useHeroSightingMemberColors(relevantGuildIds);

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
      actions={
        <IconButton
          label={t("actions.add")}
          active={addOpen}
          onClick={() => setAddOpen((open) => !open)}
        >
          <Plus size={14} aria-hidden="true" />
        </IconButton>
      }
    >
      <div className="ll:relative ll:flex ll:h-full ll:flex-col">
        {detectionNotice.mounted && shownDetection ? (
          <HeroDetectionNotice
            detection={shownDetection}
            sightings={sightings}
            userId={userId}
            writableGuildIds={writableGuildIds}
            className={
              detectionNotice.leaving
                ? "ll-notice-exit"
                : shownDetection !== mountedDetection
                  ? "ll-row-enter"
                  : undefined
            }
            onDismiss={dismissOwnDetection}
          />
        ) : null}
        <div className="ll:flex ll:min-h-0 ll:w-full ll:flex-1">
          <AsyncContent
            error={query.data ? null : query.error}
            errorLabel={t("states.loadError")}
            isLoading={query.data === undefined && !query.error}
            loadingLabel={t("states.loading")}
            onRetry={() => void query.refetch()}
            retryLabel={t("actions.retry", { ns: "common" })}
          >
            <ScrollArea className="ll:h-full ll:w-full!">
              <HeroSightingsList
                rows={rows}
                userId={userId}
                writableGuildIds={writableGuildIds}
                memberColors={memberColors}
              />
            </ScrollArea>
          </AsyncContent>
        </div>
        {addOpen ? (
          <AddHeroSightingPanel
            world={world}
            onClose={() => setAddOpen(false)}
            className="ll:rounded-b-md"
          />
        ) : null}
      </div>
    </DraggableWindow>
  );
};
