import * as m from "framer-motion/m";
import { DestructionFilter } from "./destruction-filter";
import { FloatingParticles } from "./floating-particles";
import { AmbientMagicCircle } from "./ambient-magic-circle";
import { DestructionEdgeGlow } from "./destruction-edge-glow";
import { AmbientMagicCircleTopLeft } from "./ambient-magic-circle-top-left";
import { DestructionVignette } from "./destruction-vignette";
import { DestructionFlow } from "./destruction-flow";

// Global ambient destruction overlay for the entire app
export const GlobalDestructionOverlay = () => (
  <m.div
    className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 2, ease: "easeOut" }}
  >
    <DestructionFilter />
    <DestructionEdgeGlow />
    <DestructionVignette />
    <DestructionFlow />
    <AmbientMagicCircle />
    <AmbientMagicCircleTopLeft />
    <FloatingParticles />
  </m.div>
);
