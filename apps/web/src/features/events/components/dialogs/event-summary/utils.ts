export type StepMotionPreset = {
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  exit: Record<string, number | string>;
};

export const formatMetric = (value: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
};

export const formatHourLabel = (hour: number | null): string => {
  if (hour === null) {
    return "--:--";
  }

  return `${hour.toString().padStart(2, "0")}:00`;
};

export const getStepMotionPreset = (
  stepId: string,
  direction: number,
  prefersReducedMotion: boolean,
): StepMotionPreset => {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  switch (stepId) {
    case "intro":
      return {
        initial: { opacity: 0, scale: 0.94, y: 28, filter: "blur(14px)" },
        animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 1.03, y: -18, filter: "blur(10px)" },
      };
    case "scale":
      return {
        initial: {
          opacity: 0,
          x: direction > 0 ? 90 : -90,
          skewX: direction > 0 ? -4 : 4,
          filter: "blur(12px)",
        },
        animate: { opacity: 1, x: 0, skewX: 0, filter: "blur(0px)" },
        exit: {
          opacity: 0,
          x: direction > 0 ? -70 : 70,
          skewX: direction > 0 ? 2 : -2,
          filter: "blur(8px)",
        },
      };
    case "loot":
      return {
        initial: {
          opacity: 0,
          scale: 0.9,
          rotate: direction > 0 ? 1.8 : -1.8,
          filter: "blur(14px)",
        },
        animate: { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" },
        exit: {
          opacity: 0,
          scale: 1.04,
          rotate: direction > 0 ? -1.4 : 1.4,
          filter: "blur(10px)",
        },
      };
    case "leaders":
      return {
        initial: { opacity: 0, y: 40, scale: 0.97, filter: "blur(12px)" },
        animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, y: -26, scale: 1.02, filter: "blur(8px)" },
      };
    case "coverage":
      return {
        initial: {
          opacity: 0,
          x: direction > 0 ? 120 : -120,
          rotate: direction > 0 ? 2.4 : -2.4,
          scale: 0.95,
          filter: "blur(16px)",
        },
        animate: {
          opacity: 1,
          x: 0,
          rotate: 0,
          scale: 1,
          filter: "blur(0px)",
        },
        exit: {
          opacity: 0,
          x: direction > 0 ? -110 : 110,
          rotate: direction > 0 ? -1.8 : 1.8,
          scale: 0.985,
          filter: "blur(10px)",
        },
      };
    case "finale":
      return {
        initial: {
          opacity: 0,
          scale: 0.92,
          y: 18,
          rotateX: -10,
          filter: "blur(14px)",
        },
        animate: {
          opacity: 1,
          scale: 1,
          y: 0,
          rotateX: 0,
          filter: "blur(0px)",
        },
        exit: {
          opacity: 0,
          scale: 1.05,
          y: -14,
          rotateX: 8,
          filter: "blur(10px)",
        },
      };
    default:
      return {
        initial: {
          opacity: 0,
          x: direction > 0 ? 110 : -110,
          rotate: direction > 0 ? 2.5 : -2.5,
          scale: 0.96,
          filter: "blur(12px)",
        },
        animate: {
          opacity: 1,
          x: 0,
          rotate: 0,
          scale: 1,
          filter: "blur(0px)",
        },
        exit: {
          opacity: 0,
          x: direction > 0 ? -110 : 110,
          rotate: direction > 0 ? -2 : 2,
          scale: 0.985,
          filter: "blur(10px)",
        },
      };
  }
};
