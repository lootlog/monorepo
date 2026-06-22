import * as React from "react";

import { createSeededRandom, hashString } from "@lootlog/ui/lib/seeded-random";

export const PAW_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cellipse cx='16' cy='21' rx='6.5' ry='5' fill='white'/%3E%3Ccircle cx='7' cy='11' r='3' fill='white'/%3E%3Ccircle cx='13' cy='7' r='2.8' fill='white'/%3E%3Ccircle cx='19' cy='7' r='2.8' fill='white'/%3E%3Ccircle cx='25' cy='11' r='3' fill='white'/%3E%3C/svg%3E";

const CAT_CLASSES = ["cat-pink", "cat-purple", "cat-blue"];

export function useCatTheme() {
  const [isCat, setIsCat] = React.useState(() => {
    if (typeof document === "undefined") return false;
    return CAT_CLASSES.some((c) =>
      document.documentElement.classList.contains(c),
    );
  });

  React.useEffect(() => {
    const root = document.documentElement;
    const check = () =>
      setIsCat(CAT_CLASSES.some((c) => root.classList.contains(c)));
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isCat;
}

function createCatPaws(id: string) {
  const random = createSeededRandom(hashString(id));

  for (let i = 0; i < 20; i++) random();

  const result: Array<{
    id: string;
    left: string;
    top: string;
    size: number;
    rotation: number;
    opacity: number;
  }> = [];

  const startX = random() * 100;
  const startY = random() * 100;

  let walkAngle = random() * Math.PI * 2;

  const curveBias = (random() - 0.5) * 0.6;

  const baseSize = 35 + random() * 15;
  const baseOpacity = 0.03 + random() * 0.03;
  const steps = 12 + Math.floor(random() * 8);

  const strideForwardPx = baseSize * 0.75;
  const strideLateralPx = baseSize * 0.6;
  const pawRotationOutward = 12;

  let bodyAccumulatedX = 0;
  let bodyAccumulatedY = 0;

  for (let i = 0; i < steps; i++) {
    const isRightPaw = i % 2 === 0;

    walkAngle += curveBias + (random() - 0.5) * 0.15;

    bodyAccumulatedX += Math.cos(walkAngle) * strideForwardPx;
    bodyAccumulatedY += Math.sin(walkAngle) * strideForwardPx;

    const perpendicularAngle = walkAngle + Math.PI / 2;
    const sideOffset = isRightPaw ? strideLateralPx : -strideLateralPx;

    const pawX = bodyAccumulatedX + Math.cos(perpendicularAngle) * sideOffset;
    const pawY = bodyAccumulatedY + Math.sin(perpendicularAngle) * sideOffset;

    const angleInDegrees = walkAngle * (180 / Math.PI) + 90;
    const pawRotation =
      angleInDegrees + (isRightPaw ? pawRotationOutward : -pawRotationOutward);

    const signX = pawX >= 0 ? "+" : "-";
    const signY = pawY >= 0 ? "+" : "-";

    result.push({
      id: `paw-${i}`,
      left: `calc(${startX}% ${signX} ${Math.abs(pawX)}px)`,
      top: `calc(${startY}% ${signY} ${Math.abs(pawY)}px)`,
      size: baseSize + (random() * 4 - 2),
      rotation: pawRotation,
      opacity: baseOpacity,
    });
  }

  return result;
}

export function CatPawOverlay() {
  const isCatTheme = useCatTheme();
  const id = React.useId();
  const paws = createCatPaws(id);

  if (!isCatTheme) return null;

  return (
    <div
      data-slot="cat-paw-overlay"
      className="cat-paw-overlay"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {paws.map((paw) => (
        <div
          key={paw.id}
          style={{
            position: "absolute",
            left: paw.left,
            top: paw.top,
            width: paw.size,
            height: paw.size,
            transform: `translate(-50%, -50%) rotate(${paw.rotation}deg)`,
            opacity: paw.opacity,
            backgroundImage: `url("${PAW_SVG}")`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}
