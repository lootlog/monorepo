import { startTransition, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import {
  getShowEventWrappedQueryKey,
  useShowEventWrapped,
} from "@lootlog/api-client/react-query/main/events";
import { buildWrappedDeck } from "./event-summary/build-wrapped-slides";
import { buildWrappedQualityModel } from "./event-summary/wrapped-data-quality";
import { LoadingState } from "./event-summary/loading-state";
import { useWrappedAutoplay } from "./event-summary/use-wrapped-autoplay";
import { WrappedProgress } from "./event-summary/wrapped-progress";
import { WrappedSlideContent } from "./event-summary/wrapped-slide-content";
import { WrappedSparseSummary } from "./event-summary/wrapped-sparse-summary";

interface EventSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  eventId: string;
  eventName: string;
}

export const EventSummaryDialog = ({
  open,
  onOpenChange,
  guildId,
  eventId,
  eventName,
}: EventSummaryDialogProps) => {
  const { t } = useTranslation();
  const prefersReducedMotion = Boolean(useReducedMotion());
  const stageRef = useRef<HTMLElement>(null);
  const previousIndexRef = useRef(0);
  const [currentSlideId, setCurrentSlideId] = useState("opening");
  const [direction, setDirection] = useState<1 | -1>(1);
  const { data, isLoading, error, refetch } = useShowEventWrapped(
    { guildId, eventId },
    {
      query: {
        enabled: open,
        queryKey: getShowEventWrappedQueryKey({ guildId, eventId }),
      },
    },
  );

  const deck = data ? buildWrappedDeck(buildWrappedQualityModel(data)) : null;
  const slides = deck?.mode === "presentation" ? deck.slides : [];
  const matchingIndex = slides.findIndex(
    (slide) => slide.id === currentSlideId,
  );
  const activeIndex =
    matchingIndex >= 0
      ? matchingIndex
      : Math.min(previousIndexRef.current, Math.max(slides.length - 1, 0));
  const activeSlide = slides[activeIndex];
  const isFinalSlide = activeSlide?.kind === "finale";

  useEffect(() => {
    if (!open) {
      return;
    }

    previousIndexRef.current = 0;
    startTransition(() => {
      setDirection(1);
      setCurrentSlideId("opening");
    });
  }, [open]);

  useEffect(() => {
    previousIndexRef.current = activeIndex;
    if (activeSlide && activeSlide.id !== currentSlideId) {
      setCurrentSlideId(activeSlide.id);
    }
  }, [activeIndex, activeSlide, currentSlideId]);

  const advanceAutomatically = () => {
    if (!activeSlide || activeIndex >= slides.length - 1) {
      return;
    }

    setDirection(1);
    setCurrentSlideId(slides[activeIndex + 1]?.id ?? activeSlide.id);
  };

  const autoplay = useWrappedAutoplay({
    activeSlideId: activeSlide?.id ?? "empty",
    enabled:
      open &&
      deck?.mode === "presentation" &&
      !isFinalSlide &&
      !prefersReducedMotion,
    interactionEnabled: open && deck?.mode === "presentation",
    stageRef,
    onAdvance: advanceAutomatically,
  });

  const selectSlide = (index: number) => {
    const nextSlide = slides[index];
    if (!nextSlide || index === activeIndex) {
      return;
    }

    setDirection(index > activeIndex ? 1 : -1);
    autoplay.reset();
    setCurrentSlideId(nextSlide.id);
  };

  useEffect(() => {
    if (!open || deck?.mode !== "presentation") {
      return;
    }

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      const target = keyboardEvent.target;
      if (
        target instanceof HTMLElement &&
        target.closest("button, a, input, textarea, select, [contenteditable]")
      ) {
        return;
      }

      if (keyboardEvent.key === "ArrowLeft" && activeIndex > 0) {
        keyboardEvent.preventDefault();
        selectSlide(activeIndex - 1);
      }

      if (
        keyboardEvent.key === "ArrowRight" &&
        activeIndex < slides.length - 1
      ) {
        keyboardEvent.preventDefault();
        selectSlide(activeIndex + 1);
      }

      if (keyboardEvent.key === " ") {
        keyboardEvent.preventDefault();
        autoplay.toggleUserPaused();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  let activeSlideLabel = "";
  if (activeSlide?.kind === "fact") {
    activeSlideLabel = t(`events.summaryDialog.facts.${activeSlide.id}.label`);
  } else if (activeSlide) {
    activeSlideLabel = t(
      `events.summaryDialog.${activeSlide.kind}ProgressLabel`,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 shadow-xl sm:h-[calc(100dvh-2rem)] sm:max-h-[900px] sm:w-[calc(100vw-2rem)] sm:max-w-6xl"
        showCloseButton={false}
      >
        <header className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4 pr-1">
            <div className="min-w-0">
              <DialogTitle className="px-0 pt-0 text-base">
                {t("events.summaryDialog.title")}
              </DialogTitle>
              <DialogDescription className="mt-1 truncate px-0 text-xs">
                {eventName}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {t("events.summaryDialog.close")}
            </Button>
          </div>
          {deck?.mode === "presentation" && activeSlide ? (
            <div className="mt-3">
              <WrappedProgress
                slides={slides}
                activeIndex={activeIndex}
                progress={isFinalSlide ? 1 : autoplay.progress}
                isUserPaused={autoplay.isUserPaused}
                onSelect={selectSlide}
                onTogglePaused={autoplay.toggleUserPaused}
              />
            </div>
          ) : null}
        </header>

        <main
          ref={stageRef}
          className="relative min-h-0 flex-1 overflow-hidden bg-background"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="w-full max-w-xl">
                <LoadingState
                  title={t("events.summaryDialog.loadingTitle")}
                  description={t("events.summaryDialog.loadingDescription")}
                />
              </div>
            </div>
          ) : error || !data || !deck ? (
            <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center px-6 text-center">
              <p className="text-lg font-semibold">
                {t("events.summaryDialog.errorTitle")}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("events.summaryDialog.errorDescription")}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-6"
                onClick={() => void refetch()}
              >
                <RotateCcw className="size-4" />
                {t("events.summaryDialog.retry")}
              </Button>
            </div>
          ) : deck.mode === "sparse" ? (
            <WrappedSparseSummary eventName={eventName} facts={deck.facts} />
          ) : activeSlide ? (
            <>
              <AnimatePresence initial={false} mode="wait" custom={direction}>
                <motion.div
                  key={activeSlide.id}
                  custom={direction}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: direction * 40 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: direction * -40 }
                  }
                  transition={{ duration: prefersReducedMotion ? 0.12 : 0.24 }}
                  className="h-full"
                >
                  <WrappedSlideContent
                    slide={activeSlide}
                    eventName={eventName}
                    world={data.event.world}
                  />
                </motion.div>
              </AnimatePresence>
              {activeIndex > 0 ? (
                <button
                  type="button"
                  className="group absolute inset-y-0 left-0 z-10 flex w-16 items-center justify-start pl-3 text-muted-foreground outline-none sm:w-24 sm:pl-5"
                  aria-label={t("events.summaryDialog.previous")}
                  onClick={() => selectSlide(activeIndex - 1)}
                >
                  <span className="flex size-9 items-center justify-center rounded-full border border-border bg-background/80 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ArrowLeft className="size-4" />
                  </span>
                </button>
              ) : null}
              {!isFinalSlide ? (
                <button
                  type="button"
                  className="group absolute inset-y-0 right-0 z-10 flex w-16 items-center justify-end pr-3 text-muted-foreground outline-none sm:w-24 sm:pr-5"
                  aria-label={t("events.summaryDialog.next")}
                  onClick={() => selectSlide(activeIndex + 1)}
                >
                  <span className="flex size-9 items-center justify-center rounded-full border border-border bg-background/80 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ArrowRight className="size-4" />
                  </span>
                </button>
              ) : null}
            </>
          ) : null}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {activeSlideLabel}
          </p>
        </main>

        {deck?.mode === "presentation" && activeSlide ? (
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => selectSlide(activeIndex - 1)}
              disabled={activeIndex === 0}
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">
                {t("events.summaryDialog.previous")}
              </span>
            </Button>
            <p className="text-xs tabular-nums text-muted-foreground">
              {t("events.summaryDialog.stepCounter", {
                current: activeIndex + 1,
                total: slides.length,
              })}
            </p>
            {isFinalSlide ? (
              <Button type="button" onClick={() => onOpenChange(false)}>
                {t("events.summaryDialog.finish")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => selectSlide(activeIndex + 1)}
              >
                <span className="hidden sm:inline">
                  {t("events.summaryDialog.next")}
                </span>
                <ArrowRight className="size-4" />
              </Button>
            )}
          </footer>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
