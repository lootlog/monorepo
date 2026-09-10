import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { LoadingState } from "./event-summary/loading-state";
import { WrappedProgress } from "./event-summary/wrapped-progress";
import { WrappedSlideContent } from "./event-summary/wrapped-slide-content";
import { WrappedSparseSummary } from "./event-summary/wrapped-sparse-summary";
import {
  useEventSummaryDialog,
  type EventSummaryDialogProps,
} from "./use-event-summary-dialog";

export const EventSummaryDialog = ({
  open,
  onOpenChange,
  guildId,
  eventId,
  eventName,
}: EventSummaryDialogProps) => {
  const {
    isLoading,
    t,
    error,
    data,
    deck,
    isFetching,
    refetch,
    activeSlide,
    direction,
    prefersReducedMotion,
    activeIndex,
    selectSlide,
    isFinalSlide,
    slides,
    autoplay,
    stageRef,
    activeSlideLabel,
  } = useEventSummaryDialog({
    open,
    onOpenChange,
    guildId,
    eventId,
    eventName,
  });
  const renderStage = () => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center px-6">
          <div className="w-full max-w-xl">
            <LoadingState
              title={t("events.summaryDialog.loadingTitle")}
              description={t("events.summaryDialog.loadingDescription")}
            />
          </div>
        </div>
      );
    }
    if (error || !data || !deck) {
      return (
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
            loading={isFetching}
            icon=<RotateCcw className="size-4" />
            onClick={() => void refetch()}
          >
            {t("events.summaryDialog.retry")}
          </Button>
        </div>
      );
    }
    if (deck.mode === "sparse") {
      return <WrappedSparseSummary eventName={eventName} facts={deck.facts} />;
    }
    if (!activeSlide) {
      return null;
    }
    return (
      <>
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          <m.div
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
          </m.div>
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
    );
  };

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
          {renderStage()}
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
