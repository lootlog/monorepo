import * as React from "react";

import { createCardOverlayElements } from "@lootlog/ui/lib/card-overlay-elements";
import { CardParticleOverlay } from "./card-particle-overlay";

// Magic circle SVG as data URI
const MAGIC_CIRCLE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='none' stroke='white' stroke-width='0.6'/%3E%3Ccircle cx='12' cy='12' r='6' fill='none' stroke='white' stroke-width='0.4'/%3E%3Cpolygon points='12,3 14,9 20,9.5 15.5,13 17,20 12,16.5 7,20 8.5,13 4,9.5 10,9' fill='none' stroke='white' stroke-width='0.35'/%3E%3Ccircle cx='12' cy='12' r='2' fill='white' opacity='0.4'/%3E%3C/svg%3E";

// Destruction energy particle as data URI
const ENERGY_PARTICLE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Ccircle cx='4' cy='4' r='3' fill='white' opacity='0.6'/%3E%3Ccircle cx='4' cy='4' r='1.5' fill='white' opacity='0.9'/%3E%3C/svg%3E";

export function RiasMagicCardOverlay() {
  const id = React.useId();
  return (
    <CardParticleOverlay
      slot="rias-magic-card-overlay"
      elements={createCardOverlayElements(id, {
        prefix: "rias",
        minimumCount: 5,
        variantThreshold: 0.5,
        opacity: 0.02,
        first: { image: MAGIC_CIRCLE_SVG, minimumSize: 20, sizeSpread: 16 },
        second: { image: ENERGY_PARTICLE_SVG, minimumSize: 8, sizeSpread: 6 },
      })}
    />
  );
}
