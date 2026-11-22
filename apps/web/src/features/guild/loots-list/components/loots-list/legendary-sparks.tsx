import { createSeededRandom } from "@lootlog/ui/lib/seeded-random";
import type { CSSProperties } from "react";
import { usePauseSparksWhileScrolling } from "./use-pause-sparks-while-scrolling";
import "./legendary-loot.css";

type SparkStyle = CSSProperties & { "--spark-color": string };

const SPARK_PATH_COUNT = 6;

const SPARK_COLORS = ["#fed7aa", "#fdba74", "#fb923c", "#f97316"];

const SPARK_EASINGS = ["linear", "ease-out", "cubic-bezier(0.3, 0, 0.7, 1)"];

const between = (random: () => number, min: number, max: number) =>
  min + random() * (max - min);

const pickIndex = (random: () => number, length: number) =>
  Math.floor(random() * length);

const buildSparkStyles = (seed: number): SparkStyle[] => {
  const random = createSeededRandom(seed + 1);

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
