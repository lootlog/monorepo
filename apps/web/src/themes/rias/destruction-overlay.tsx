import { DestructionFilter } from "./destruction-filter";
import { DestructionParticle } from "./destruction-particle";
import { MagicCircle } from "./magic-circle";
import { DestructionRunes } from "./destruction-runes";
import {
  buttonParticlePositions,
  buttonMagicCirclePositions,
} from "./gremory-button-positions";

// Destruction overlay for containers (static, always visible)
export const DestructionOverlay = ({
  subtle = false,
  rounded = "rounded-xl",
}: {
  subtle?: boolean;
  rounded?: string;
}) => {
  const intensity = subtle ? 0.35 : 1;

  return (
    <>
      <DestructionFilter />

      {/* Energy texture */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded} overflow-hidden`}
        style={{ opacity: intensity }}
      >
        <div
          className="absolute inset-0"
          style={{
            filter: "url(#destruction-glow)",
            background: "rgba(200, 30, 60, 0.3)",
          }}
        />
      </div>

      {/* Multi-gradient overlay */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded}`}
        style={{
          background:
            `radial-gradient(ellipse at 30% 20%, rgba(200, 30, 60, ${0.12 * intensity}) 0%, transparent 50%), ` +
            `radial-gradient(ellipse at 70% 80%, rgba(90, 20, 60, ${0.1 * intensity}) 0%, transparent 50%), ` +
            `linear-gradient(135deg, rgba(200, 30, 60, ${0.06 * intensity}) 0%, rgba(90, 20, 60, ${0.04 * intensity}) 50%, rgba(200, 30, 60, ${0.06 * intensity}) 100%)`,
        }}
      />

      {/* Edge glow */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded} overflow-hidden`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              `linear-gradient(180deg, rgba(200, 30, 60, ${0.1 * intensity}) 0%, transparent 40%), ` +
              `linear-gradient(0deg, rgba(200, 30, 60, ${0.1 * intensity}) 0%, transparent 40%), ` +
              `linear-gradient(90deg, rgba(200, 30, 60, ${0.08 * intensity}) 0%, transparent 30%), ` +
              `linear-gradient(270deg, rgba(200, 30, 60, ${0.08 * intensity}) 0%, transparent 30%)`,
          }}
        />
      </div>

      <DestructionRunes isVisible />

      {buttonMagicCirclePositions.map((mc) => (
        <MagicCircle
          key={`${mc.x}:${mc.y}`}
          x={mc.x}
          y={mc.y}
          size={mc.size}
          isVisible
          delay={mc.delay}
        />
      ))}

      {buttonParticlePositions.map((p) => (
        <DestructionParticle
          key={`${p.x}:${p.y}`}
          x={p.x}
          y={p.y}
          size={p.size}
          isVisible
          delay={p.delay}
        />
      ))}
    </>
  );
};
