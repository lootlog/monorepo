import { startTransition, useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Sparkles, Trophy } from "lucide-react";
import { cn } from "@/utils/cn";
import { useShowEventWrapped } from "@/lib/api/generated/main/events/events";
import { buildSteps } from "./event-summary/build-steps";
import { LoadingState } from "./event-summary/loading-state";
import { SlideNavButton } from "./event-summary/slide-nav-button";
import { StepDots } from "./event-summary/step-dots";
import { getStepMotionPreset } from "./event-summary/utils";

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
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const prefersReducedMotion = useReducedMotion();
  const { data, isLoading, error } = useShowEventWrapped({
    guildId,
    eventId,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    startTransition(() => {
      setDirection(1);
      setCurrentStep(0);
    });
  }, [open]);

  const steps = data ? buildSteps(t, data) : [];
  const safeStep = Math.min(currentStep, Math.max(steps.length - 1, 0));
  const activeStep = steps[safeStep];
  const hasReducedMotion = Boolean(prefersReducedMotion);
  const stepMotionPreset = activeStep
    ? getStepMotionPreset(activeStep.id, direction, hasReducedMotion)
    : getStepMotionPreset("default", direction, hasReducedMotion);

  const selectStep = (index: number) => {
    if (index === safeStep) {
      return;
    }

    setDirection(index > safeStep ? 1 : -1);

    startTransition(() => {
      setCurrentStep(index);
    });
  };

  const slideTransition: Transition = prefersReducedMotion
    ? { duration: 0.12 }
    : {
        type: "spring",
        stiffness: 240,
        damping: 28,
        mass: 0.9,
      };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[88vh] max-h-[88vh] gap-0 overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.08),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_22%),hsl(var(--background))] p-0 sm:max-w-5xl sm:h-[min(92vh,820px)] sm:max-h-[min(92vh,820px)] flex flex-col">
        <DialogHeader className="shrink-0 border-b border-border/70 bg-background/80 px-5 pt-5 pb-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="px-0 pt-0 text-base sm:text-lg">
                  {t("events.summaryDialog.title")}
                </DialogTitle>
                <DialogDescription className="px-0 text-xs sm:text-sm">
                  {eventName}
                </DialogDescription>
                {!isLoading && activeStep ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="bg-background/80 text-xs"
                    >
                      {activeStep.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-background/80 text-xs"
                    >
                      {t("events.summaryDialog.stepCounter", {
                        current: safeStep + 1,
                        total: steps.length,
                      })}
                    </Badge>
                  </div>
                ) : null}
              </div>
            </div>

            {!isLoading && steps.length > 0 ? (
              <StepDots
                total={steps.length}
                current={safeStep}
                onSelect={selectStep}
                getAriaLabel={(index) =>
                  t("events.summaryDialog.dotAriaLabel", {
                    step: index + 1,
                  })
                }
              />
            ) : null}
          </div>
        </DialogHeader>

        <div className="relative flex-1 min-h-0 overflow-hidden">
          {!prefersReducedMotion ? (
            <>
              <motion.div
                aria-hidden
                className="pointer-events-none absolute left-[-12%] top-[-8%] h-44 w-44 rounded-full bg-sky-500/12 blur-3xl"
                animate={{
                  x: [0, 28, 0],
                  y: [0, 20, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute bottom-[-10%] right-[-6%] h-52 w-52 rounded-full bg-yellow-500/12 blur-3xl"
                animate={{
                  x: [0, -24, 0],
                  y: [0, -18, 0],
                  scale: [1.04, 0.96, 1.04],
                }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              {activeStep ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`ambient-${activeStep.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="pointer-events-none absolute inset-0"
                  >
                    <motion.div
                      aria-hidden
                      className={cn(
                        "absolute blur-3xl",
                        activeStep.id === "intro" &&
                          "left-[8%] top-[12%] h-44 w-44 rounded-full bg-yellow-400/12",
                        activeStep.id === "scale" &&
                          "left-[14%] top-[24%] h-40 w-56 rounded-full bg-emerald-400/10",
                        activeStep.id === "loot" &&
                          "right-[12%] top-[18%] h-44 w-44 rounded-full bg-rose-400/10",
                        activeStep.id === "leaders" &&
                          "left-[18%] bottom-[16%] h-36 w-60 rounded-full bg-sky-400/10",
                        activeStep.id === "coverage" &&
                          "right-[8%] bottom-[18%] h-48 w-48 rounded-full bg-blue-400/12",
                        activeStep.id === "finale" &&
                          "left-[22%] top-[16%] h-44 w-64 rounded-full bg-yellow-300/10",
                      )}
                      animate={{
                        x: [0, activeStep.id === "scale" ? 18 : 12, 0],
                        y: [0, activeStep.id === "leaders" ? -14 : 14, 0],
                        scale: [1, activeStep.id === "loot" ? 1.12 : 1.08, 1],
                      }}
                      transition={{
                        duration: 8.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <motion.div
                      aria-hidden
                      className={cn(
                        "absolute blur-3xl",
                        activeStep.id === "intro" &&
                          "right-[14%] bottom-[18%] h-40 w-52 rounded-full bg-sky-400/10",
                        activeStep.id === "scale" &&
                          "right-[10%] bottom-[18%] h-44 w-44 rounded-full bg-yellow-300/10",
                        activeStep.id === "loot" &&
                          "left-[10%] bottom-[20%] h-48 w-60 rounded-full bg-yellow-300/10",
                        activeStep.id === "leaders" &&
                          "right-[12%] top-[20%] h-42 w-42 rounded-full bg-amber-300/10",
                        activeStep.id === "coverage" &&
                          "left-[10%] top-[18%] h-52 w-64 rounded-full bg-cyan-300/10",
                        activeStep.id === "finale" &&
                          "right-[10%] bottom-[14%] h-52 w-52 rounded-full bg-rose-300/10",
                      )}
                      animate={{
                        x: [0, activeStep.id === "coverage" ? -16 : -12, 0],
                        y: [0, activeStep.id === "finale" ? 16 : -10, 0],
                        scale: [1.02, 0.94, 1.02],
                      }}
                      transition={{
                        duration: 10.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.4,
                      }}
                    />
                  </motion.div>
                </AnimatePresence>
              ) : null}
            </>
          ) : null}

          {!isLoading && activeStep ? (
            <div className="pointer-events-none absolute inset-0 z-20">
              <SlideNavButton
                direction="previous"
                disabled={safeStep === 0 || steps.length === 0}
                onClick={() => selectStep(Math.max(safeStep - 1, 0))}
                label={t("events.summaryDialog.previous")}
              />
              <SlideNavButton
                direction="next"
                disabled={steps.length === 0}
                onClick={() => {
                  if (safeStep >= steps.length - 1) {
                    onOpenChange(false);
                    return;
                  }

                  selectStep(Math.min(safeStep + 1, steps.length - 1));
                }}
                label={
                  safeStep >= steps.length - 1
                    ? t("events.summaryDialog.finish")
                    : t("events.summaryDialog.next")
                }
              />
            </div>
          ) : null}

          <div className="relative h-full min-h-0 px-3 pb-3 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center px-2 sm:px-10">
                <div className="w-full max-w-4xl">
                  <LoadingState
                    title={t("events.summaryDialog.loadingTitle")}
                    description={t("events.summaryDialog.loadingDescription")}
                  />
                </div>
              </div>
            ) : error || !data || !activeStep ? (
              <div className="flex h-full items-center justify-center px-2 sm:px-10">
                <div className="w-full max-w-3xl rounded-[32px] border border-dashed border-border/70 bg-background/60 p-8 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {t("events.summaryDialog.errorTitle")}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("events.summaryDialog.errorDescription")}
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence custom={direction} initial={false} mode="wait">
                <motion.div
                  key={activeStep.id}
                  custom={direction}
                  initial={stepMotionPreset.initial}
                  animate={stepMotionPreset.animate}
                  exit={stepMotionPreset.exit}
                  transition={slideTransition}
                  className="h-full"
                >
                  <ScrollArea className="h-full">
                    <div className="space-y-4 px-10 pb-6 pt-2 sm:px-14 sm:pb-8 sm:pt-3">
                      <motion.div
                        initial={
                          prefersReducedMotion ? false : { opacity: 0, y: 12 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: prefersReducedMotion ? 0 : 0.08,
                          duration: 0.22,
                        }}
                        className="flex flex-wrap items-center gap-2 text-muted-foreground"
                      >
                        <Badge
                          variant="outline"
                          className="gap-1 bg-background/80 text-xs shadow-sm"
                        >
                          <Sparkles className="size-3" />
                          {activeStep.title}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="gap-1 bg-background/80 text-xs shadow-sm"
                        >
                          <Trophy className="size-3" />
                          {activeStep.description}
                        </Badge>
                      </motion.div>

                      {activeStep.content}
                    </div>
                  </ScrollArea>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
