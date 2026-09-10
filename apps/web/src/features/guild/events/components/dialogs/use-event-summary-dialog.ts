import {
  getShowEventWrappedQueryKey,
  useShowEventWrapped,
} from "@lootlog/client/main";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildWrappedDeck } from "./event-summary/build-wrapped-slides";
import { useWrappedAutoplay } from "./event-summary/use-wrapped-autoplay";
import { buildWrappedQualityModel } from "./event-summary/wrapped-data-quality";

export interface EventSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  eventId: string;
  eventName: string;
}

export function useEventSummaryDialog({
  open,
  guildId,
  eventId,
}: EventSummaryDialogProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = Boolean(useReducedMotion());
  const stageRef = useRef<HTMLElement>(null);
  const [selection, setSelection] = useState({ id: "opening", index: 0 });
  const currentSlideId = selection.id;
  const [direction, setDirection] = useState<1 | -1>(1);
  const { data, isLoading, isFetching, error, refetch } = useShowEventWrapped(
    { guildId, eventId },
    {
      query: {
        enabled: open,
        queryKey: getShowEventWrappedQueryKey({ guildId, eventId }),
      },
    },
  );

  const resolveSlideState = () => {
    const deck = data ? buildWrappedDeck(buildWrappedQualityModel(data)) : null;
    const slides = deck?.mode === "presentation" ? deck.slides : [];
    const matchingIndex = slides.findIndex(
      (slide) => slide.id === currentSlideId,
    );
    const activeIndex =
      matchingIndex >= 0
        ? matchingIndex
        : Math.min(selection.index, Math.max(slides.length - 1, 0));
    const activeSlide = slides[activeIndex];
    return {
      deck,
      slides,
      activeIndex,
      activeSlide,
      isFinalSlide: activeSlide?.kind === "finale",
    };
  };
  const { deck, slides, activeIndex, activeSlide, isFinalSlide } =
    resolveSlideState();

  // This state drives the render-time slide reset when reopening; changing it to a ref would lose the committed reopen transition.
  // eslint-disable-next-line react-doctor/rerender-state-only-in-handlers
  const [wasOpen, setWasOpen] = useState(open);
  const synchronizeSlide = () => {
    if (wasOpen !== open) {
      setWasOpen(open);
      if (open) {
        setDirection(1);
        setSelection({ id: "opening", index: 0 });
      }
    } else if (
      activeSlide &&
      (activeSlide.id !== selection.id || activeIndex !== selection.index)
    ) {
      setSelection({ id: activeSlide.id, index: activeIndex });
    }
  };
  synchronizeSlide();

  const advanceAutomatically = () => {
    if (!activeSlide || activeIndex >= slides.length - 1) {
      return;
    }

    setDirection(1);
    setSelection({
      id: slides[activeIndex + 1]?.id ?? activeSlide.id,
      index: activeIndex + 1,
    });
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
    setSelection({ id: nextSlide.id, index });
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

  const getActiveSlideLabel = () => {
    if (activeSlide?.kind === "fact") {
      return t(`events.summaryDialog.facts.${activeSlide.id}.label`);
    }
    if (activeSlide) {
      return t(`events.summaryDialog.${activeSlide.kind}ProgressLabel`);
    }
    return "";
  };
  const activeSlideLabel = getActiveSlideLabel();

  return {
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
  };
}
