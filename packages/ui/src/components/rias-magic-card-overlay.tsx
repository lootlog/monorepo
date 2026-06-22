import * as React from "react";

import { createSeededRandom, hashString } from "@lootlog/ui/lib/seeded-random";

const RIAS_CLASS = "rias";

export function useRiasTheme() {
  const [isRias, setIsRias] = React.useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains(RIAS_CLASS);
  });

  React.useEffect(() => {
    const root = document.documentElement;
    const check = () => setIsRias(root.classList.contains(RIAS_CLASS));
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isRias;
}

// Magic circle SVG as data URI
const MAGIC_CIRCLE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='none' stroke='white' stroke-width='0.6'/%3E%3Ccircle cx='12' cy='12' r='6' fill='none' stroke='white' stroke-width='0.4'/%3E%3Cpolygon points='12,3 14,9 20,9.5 15.5,13 17,20 12,16.5 7,20 8.5,13 4,9.5 10,9' fill='none' stroke='white' stroke-width='0.35'/%3E%3Ccircle cx='12' cy='12' r='2' fill='white' opacity='0.4'/%3E%3C/svg%3E";

// Destruction energy particle as data URI
const ENERGY_PARTICLE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Ccircle cx='4' cy='4' r='3' fill='white' opacity='0.6'/%3E%3Ccircle cx='4' cy='4' r='1.5' fill='white' opacity='0.9'/%3E%3C/svg%3E";

function createRiasOverlayElements(id: string) {
  const random = createSeededRandom(hashString(id));

  for (let i = 0; i < 20; i++) random();

  const result: Array<{
    id: string;
    left: string;
    top: string;
    size: number;
    rotation: number;
    opacity: number;
    type: "circle" | "particle";
  }> = [];

  const count = 5 + Math.floor(random() * 4);

  for (let i = 0; i < count; i++) {
    const type = random() > 0.5 ? "circle" : "particle";

    result.push({
      id: `rias-${i}`,
      left: `${random() * 100}%`,
      top: `${random() * 100}%`,
      size: type === "circle" ? 20 + random() * 16 : 8 + random() * 6,
      rotation: random() * 360,
      opacity: 0.02 + random() * 0.02,
      type,
    });
  }

  return result;
}

export function RiasMagicCardOverlay() {
  const isRiasTheme = useRiasTheme();
  const id = React.useId();
  const elements = createRiasOverlayElements(id);

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
