import type { FC } from "react";
import { cn } from "cn";

interface RiasMagicSpinnerProps {
  className?: string;
}

export const RiasMagicSpinner: FC<RiasMagicSpinnerProps> = ({ className }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("size-14 animate-spin", className)}
    style={{
      animationDuration: "4s",
      animationTimingFunction: "linear",
      filter: "drop-shadow(0 0 6px rgba(200, 30, 60, 0.4))",
    }}
  >
    {/* Outer circle */}
    <circle
      cx="32"
      cy="32"
      r="29"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.6"
      strokeDasharray="4 3"
    />

    {/* Middle circle */}
    <circle
      cx="32"
      cy="32"
      r="22"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.45"
    />

    {/* Inner pentagram star */}
    <polygon
      points="32,8 46.1,51.4 9.2,24.6 54.8,24.6 17.9,51.4"
      stroke="currentColor"
      strokeWidth="0.8"
      fill="none"
      opacity="0.4"
      strokeLinejoin="round"
    />

    {/* Inner hexagon */}
    <polygon
      points="32,18 44.1,25 44.1,39 32,46 19.9,39 19.9,25"
      stroke="currentColor"
      strokeWidth="0.6"
      fill="none"
      opacity="0.3"
    />

    {/* Center circle */}
    <circle
      cx="32"
      cy="32"
      r="5"
      stroke="currentColor"
      strokeWidth="0.8"
      opacity="0.5"
    />
    <circle cx="32" cy="32" r="2" fill="currentColor" opacity="0.4" />

    {/* Cardinal runes/marks */}
    <line
      x1="32"
      y1="3"
      x2="32"
      y2="7"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.5"
      strokeLinecap="round"
    />
    <line
      x1="32"
      y1="57"
      x2="32"
      y2="61"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.5"
      strokeLinecap="round"
    />
    <line
      x1="3"
      y1="32"
      x2="7"
      y2="32"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.5"
      strokeLinecap="round"
    />
    <line
      x1="57"
      y1="32"
      x2="61"
      y2="32"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.5"
      strokeLinecap="round"
    />
  </svg>
);
