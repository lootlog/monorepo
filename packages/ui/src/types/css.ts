import type { CSSProperties } from "react";

export type CSSPropertiesWithVariables = CSSProperties & {
  [key: `--${string}`]: string | number | undefined;
};
