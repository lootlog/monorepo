import { FrostFilter } from "./frost-filter";
import { ScatteredCrystal } from "./scattered-crystal";
import { Snowflake } from "./snowflake";
import { IceCracks } from "./ice-cracks";
import {
  buttonCrystalPositions,
  buttonSnowflakePositions,
} from "./frost-button-positions";

// Frost overlay for containers where we don't want to wrap content (e.g., sheets with close buttons)
// Styled like RukiaBorderGlow but static (always visible)
export const FrostOverlay = ({
  subtle = false,
  rounded = "rounded-xl",
}: {
  subtle?: boolean;
  rounded?: string;
}) => {
  const intensity = subtle ? 0.35 : 1;

  return (
    <>
      <FrostFilter />

      {/* SVG frost texture */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded} overflow-hidden`}
        style={{ opacity: intensity }}
      >
        <div
          className="absolute inset-0"
          style={{
            filter: "url(#frost-noise)",
            background: "white",
          }}
        />
      </div>

      {/* Multi-gradient overlay */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded}`}
        style={{
          background:
            `radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, ${0.25 * intensity}) 0%, transparent 50%), ` +
            `radial-gradient(ellipse at 70% 80%, rgba(200, 230, 255, ${0.2 * intensity}) 0%, transparent 50%), ` +
            `linear-gradient(135deg, rgba(220, 240, 255, ${0.15 * intensity}) 0%, rgba(200, 230, 255, ${0.1 * intensity}) 50%, rgba(220, 240, 255, ${0.15 * intensity}) 100%)`,
        }}
      />

      {/* Edge frost */}
      <div
        className={`absolute inset-0 pointer-events-none ${rounded} overflow-hidden`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              `linear-gradient(180deg, rgba(255, 255, 255, ${0.2 * intensity}) 0%, transparent 40%), ` +
              `linear-gradient(0deg, rgba(255, 255, 255, ${0.2 * intensity}) 0%, transparent 40%), ` +
              `linear-gradient(90deg, rgba(255, 255, 255, ${0.15 * intensity}) 0%, transparent 30%), ` +
              `linear-gradient(270deg, rgba(255, 255, 255, ${0.15 * intensity}) 0%, transparent 30%)`,
          }}
        />
      </div>

      <IceCracks isVisible />

      {buttonCrystalPositions.map((crystal) => (
        <ScatteredCrystal
          key={`${crystal.x}:${crystal.y}`}
          x={crystal.x}
          y={crystal.y}
          size={crystal.size * intensity}
          rotation={crystal.rotation}
          isVisible
          delay={0}
        />
      ))}

      {buttonSnowflakePositions.map((snowflake) => (
        <Snowflake
          key={`${snowflake.x}:${snowflake.y}`}
          x={snowflake.x}
          y={snowflake.y}
          size={snowflake.size * intensity}
          isVisible
          delay={0}
        />
      ))}

      {/* Ice glow border */}
      <div
        className={`absolute inset-0 ${rounded} pointer-events-none`}
        style={{
          boxShadow: `inset 0 0 12px 3px rgba(200, 230, 255, ${0.4 * intensity}), 0 0 15px 3px rgba(180, 220, 255, ${0.3 * intensity})`,
        }}
      />
    </>
  );
};
