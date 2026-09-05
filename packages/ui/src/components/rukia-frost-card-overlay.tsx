import * as React from "react";

import { createCardOverlayElements } from "@lootlog/ui/lib/card-overlay-elements";
import { CardParticleOverlay } from "./card-particle-overlay";

const SNOWFLAKE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='white' stroke-width='1' stroke-linecap='round'%3E%3Cline x1='12' y1='2' x2='12' y2='22'/%3E%3Cline x1='2' y1='12' x2='22' y2='12'/%3E%3Cline x1='4.93' y1='4.93' x2='19.07' y2='19.07'/%3E%3Cline x1='4.93' y1='19.07' x2='19.07' y2='4.93'/%3E%3Cline x1='12' y1='2' x2='10' y2='5'/%3E%3Cline x1='12' y1='2' x2='14' y2='5'/%3E%3Cline x1='12' y1='22' x2='10' y2='19'/%3E%3Cline x1='12' y1='22' x2='14' y2='19'/%3E%3C/g%3E%3C/svg%3E";

const CRYSTAL_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M8 0 L9 6 L15 6 L10 9 L12 16 L8 11 L4 16 L6 9 L1 6 L7 6 Z' fill='white'/%3E%3C/svg%3E";

export function RukiaFrostCardOverlay() {
  const id = React.useId();
  return (
    <CardParticleOverlay
      slot="rukia-frost-card-overlay"
      elements={createCardOverlayElements(id, {
        prefix: "frost",
        minimumCount: 6,
        variantThreshold: 0.4,
        opacity: 0.025,
        first: { image: SNOWFLAKE_SVG, minimumSize: 18, sizeSpread: 14 },
        second: { image: CRYSTAL_SVG, minimumSize: 10, sizeSpread: 8 },
      })}
    />
  );
}
