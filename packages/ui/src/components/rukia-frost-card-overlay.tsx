import * as React from "react";
import { hashString, seededRandom } from "../lib/seeded-random";
import { useThemeClass } from "../lib/use-theme-class";

export function useRukiaTheme() {
  return useThemeClass("rukia");
}

const SNOWFLAKE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='white' stroke-width='1' stroke-linecap='round'%3E%3Cline x1='12' y1='2' x2='12' y2='22'/%3E%3Cline x1='2' y1='12' x2='22' y2='12'/%3E%3Cline x1='4.93' y1='4.93' x2='19.07' y2='19.07'/%3E%3Cline x1='4.93' y1='19.07' x2='19.07' y2='4.93'/%3E%3Cline x1='12' y1='2' x2='10' y2='5'/%3E%3Cline x1='12' y1='2' x2='14' y2='5'/%3E%3Cline x1='12' y1='22' x2='10' y2='19'/%3E%3Cline x1='12' y1='22' x2='14' y2='19'/%3E%3C/g%3E%3C/svg%3E";

const CRYSTAL_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M8 0 L9 6 L15 6 L10 9 L12 16 L8 11 L4 16 L6 9 L1 6 L7 6 Z' fill='white'/%3E%3C/svg%3E";

export function RukiaFrostCardOverlay() {
  const isRukiaTheme = useRukiaTheme();
  const id = React.useId();

  const elements = React.useMemo(() => {
    const rand = seededRandom(hashString(id));

    for (let i = 0; i < 20; i++) rand();

    const result: Array<{
      id: string;
      left: string;
      top: string;
      size: number;
      rotation: number;
      opacity: number;
      type: "snowflake" | "crystal";
    }> = [];

    const count = 6 + Math.floor(rand() * 4);

    for (let i = 0; i < count; i++) {
      const type = rand() > 0.4 ? "snowflake" : "crystal";

      result.push({
        id: `frost-${i}`,
        left: `${rand() * 100}%`,
        top: `${rand() * 100}%`,
        size: type === "snowflake" ? 18 + rand() * 14 : 10 + rand() * 8,
        rotation: rand() * 360,
        opacity: 0.025 + rand() * 0.025,
        type,
      });
    }

    return result;
  }, [id]);

  if (!isRukiaTheme) return null;

  return (
    <div
      data-slot="rukia-frost-card-overlay"
      className="rukia-frost-card-overlay"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {elements.map((el) => (
        <div
          key={el.id}
          style={{
            position: "absolute",
            left: el.left,
            top: el.top,
            width: el.size,
            height: el.size,
            transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
            opacity: el.opacity,
            backgroundImage: `url("${el.type === "snowflake" ? SNOWFLAKE_SVG : CRYSTAL_SVG}")`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}
