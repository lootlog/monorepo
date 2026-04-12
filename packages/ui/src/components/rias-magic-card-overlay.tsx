import * as React from "react";
import { hashString, seededRandom } from "../lib/seeded-random";
import { useThemeClass } from "../lib/use-theme-class";

export function useRiasTheme() {
  return useThemeClass("rias");
}

// Magic circle SVG as data URI
const MAGIC_CIRCLE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='none' stroke='white' stroke-width='0.6'/%3E%3Ccircle cx='12' cy='12' r='6' fill='none' stroke='white' stroke-width='0.4'/%3E%3Cpolygon points='12,3 14,9 20,9.5 15.5,13 17,20 12,16.5 7,20 8.5,13 4,9.5 10,9' fill='none' stroke='white' stroke-width='0.35'/%3E%3Ccircle cx='12' cy='12' r='2' fill='white' opacity='0.4'/%3E%3C/svg%3E";

// Destruction energy particle as data URI
const ENERGY_PARTICLE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Ccircle cx='4' cy='4' r='3' fill='white' opacity='0.6'/%3E%3Ccircle cx='4' cy='4' r='1.5' fill='white' opacity='0.9'/%3E%3C/svg%3E";

export function RiasMagicCardOverlay() {
  const isRiasTheme = useRiasTheme();
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
      type: "circle" | "particle";
    }> = [];

    const count = 5 + Math.floor(rand() * 4);

    for (let i = 0; i < count; i++) {
      const type = rand() > 0.5 ? "circle" : "particle";

      result.push({
        id: `rias-${i}`,
        left: `${rand() * 100}%`,
        top: `${rand() * 100}%`,
        size: type === "circle" ? 20 + rand() * 16 : 8 + rand() * 6,
        rotation: rand() * 360,
        opacity: 0.02 + rand() * 0.02,
        type,
      });
    }

    return result;
  }, [id]);

  if (!isRiasTheme) return null;

  return (
    <div
      data-slot="rias-magic-card-overlay"
      className="rias-magic-card-overlay"
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
            backgroundImage: `url("${el.type === "circle" ? MAGIC_CIRCLE_SVG : ENERGY_PARTICLE_SVG}")`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}
