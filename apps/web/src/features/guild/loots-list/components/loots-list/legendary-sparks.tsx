import { createSeededRandom } from "@lootlog/ui/lib/seeded-random";
import type { CSSProperties } from "react";
import { usePauseSparksWhileScrolling } from "./use-pause-sparks-while-scrolling";
import "./legendary-loot.css";

type SparkStyle = CSSProperties & { "--spark-color": string };

/** Matches the `loot-spark-rise-*` keyframes in `legendary-loot.css`. */
const SPARK_PATH_COUNT = 6;

// Tailwind orange-200 to orange-500: pale sparks next to hotter ones.
const SPARK_COLORS = ["#fed7aa", "#fdba74", "#fb923c", "#f97316"];

const SPARK_EASINGS = ["linear", "ease-out", "cubic-bezier(0.3, 0, 0.7, 1)"];

const between = (random: () => number, min: number, max: number) =>
  min + random() * (max - min);

const pickIndex = (random: () => number, length: number) =>
  Math.floor(random() * length);

/**
 * Seeded by the loot, so a loot keeps its embers across re-renders and
 * scrolling while neighbouring loots never move in step. Every running ember
 * costs main-thread work whenever the page renders a frame, so the count
 * stays small.
 */
const buildSparkStyles = (seed: number): SparkStyle[] => {
  const random = createSeededRandom(seed + 1);

  // The first draws of a small seed sit close together; skip them.
  random();
  random();

  const count = 5 + pickIndex(random, 4);

  return Array.from({ length: count }, () => {
    const size =
      random() < 0.15 ? between(random, 3.5, 4.5) : between(random, 1.5, 3.2);

    const duration = between(random, 3.2, 7.5);

    return {
      left: `${between(random, 3, 97).toFixed(1)}%`,
      bottom: `${between(random, -2, 22).toFixed(1)}%`,
      width: `${size.toFixed(1)}px`,
      height: `${size.toFixed(1)}px`,
      "--spark-color":
        SPARK_COLORS[pickIndex(random, SPARK_COLORS.length)] ?? "#fb923c",
      animationName: `loot-spark-rise-${pickIndex(random, SPARK_PATH_COUNT) + 1}`,
      animationTimingFunction:
        SPARK_EASINGS[pickIndex(random, SPARK_EASINGS.length)],
      animationDuration: `${duration.toFixed(2)}s`,
      animationDelay: `${(-random() * duration).toFixed(2)}s`,
    };
  });
};

/** Embers behind a legendary loot; the parent carries `loot-legendary`. */
export const LegendarySparks = ({ seed }: { seed: number }) => {
  usePauseSparksWhileScrolling();

  return (
    <span aria-hidden="true" className="loot-sparks">
      {buildSparkStyles(seed).map((style, index) => (
        <span key={index} className="loot-spark" style={style} />
      ))}
    </span>
  );
};
