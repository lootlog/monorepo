import {
  type FallingSnowflakeType,
  FallingSnowflake,
} from "./falling-snowflake";

const getSnowflakeSize = (isTiny: boolean, isLarge: boolean) => {
  if (isTiny) return 3 + Math.random() * 4;

  if (isLarge) return 14 + Math.random() * 6;

  return 8 + Math.random() * 6;
};

const getSnowflakeFallDuration = (isTiny: boolean, isLarge: boolean) => {
  if (isTiny) return 25 + Math.random() * 15;

  if (isLarge) return 35 + Math.random() * 15;

  return 28 + Math.random() * 12;
};

const getSnowflakeOpacity = (isTiny: boolean, isLarge: boolean) => {
  if (isTiny) return 0.1 + Math.random() * 0.1;

  if (isLarge) return 0.15 + Math.random() * 0.1;

  return 0.12 + Math.random() * 0.08;
};

const getSnowflakeType = (isTiny: boolean): FallingSnowflakeType => {
  if (isTiny) return "dot";

  if (Math.random() > 0.6) return "detailed";

  return "simple";
};

// Generate snowflake configurations
const generateSnowflakes = () => {
  const snowflakes = [];
  const count = 35;

  for (let i = 0; i < count; i++) {
    const isTiny = i > count * 0.7;
    const isLarge = i < count * 0.2;

    snowflakes.push({
      id: i,
      initialX: Math.random() * 100,
      size: getSnowflakeSize(isTiny, isLarge),
      fallDuration: getSnowflakeFallDuration(isTiny, isLarge),
      delay: Math.random() * 20,
      windStrength: 0.5 + Math.random() * 1.5,
      rotationSpeed: 15 + Math.random() * 25,
      rotateDirection: Math.random() > 0.5 ? 360 : -360,
      opacity: getSnowflakeOpacity(isTiny, isLarge),
      type: getSnowflakeType(isTiny),
    });
  }

  return snowflakes;
};

const snowflakeConfigs = generateSnowflakes();

// Floating snowflakes for ambient effect
export const FloatingSnowflakes = () => {
  return (
    <>
      {snowflakeConfigs.map((sf) => (
        <FallingSnowflake key={sf.id} {...sf} />
      ))}
    </>
  );
};
