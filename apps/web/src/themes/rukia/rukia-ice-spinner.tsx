import type { FC } from "react";
import { cn } from "cn";

interface RukiaIceSpinnerProps {
  className?: string;
}

export const RukiaIceSpinner: FC<RukiaIceSpinnerProps> = ({ className }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("size-14 animate-spin", className)}
    style={{
      animationDuration: "3s",
      animationTimingFunction: "linear",
      filter: "drop-shadow(0 0 6px rgba(180, 220, 255, 0.5))",
    }}
  >
    {/* Main axes */}
    <line
      x1="32"
      y1="4"
      x2="32"
      y2="60"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.7"
    />
    <line
      x1="4"
      y1="32"
      x2="60"
      y2="32"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.7"
    />
    <line
      x1="11.2"
      y1="11.2"
      x2="52.8"
      y2="52.8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.5"
    />
    <line
      x1="52.8"
      y1="11.2"
      x2="11.2"
      y2="52.8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.5"
    />

    {/* Branch tips - top */}
    <line
      x1="32"
      y1="4"
      x2="28"
      y2="10"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.6"
    />
    <line
      x1="32"
      y1="4"
      x2="36"
      y2="10"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.6"
    />
    <line
      x1="32"
      y1="14"
      x2="28"
      y2="18"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.4"
    />
    <line
      x1="32"
      y1="14"
      x2="36"
      y2="18"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.4"
    />

    {/* Branch tips - bottom */}
    <line
      x1="32"
      y1="60"
      x2="28"
      y2="54"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.6"
    />
    <line
      x1="32"
      y1="60"
      x2="36"
      y2="54"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.6"
    />
    <line
      x1="32"
      y1="50"
      x2="28"
      y2="46"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.4"
    />
    <line
      x1="32"
      y1="50"
      x2="36"
      y2="46"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.4"
    />

    {/* Branch tips - left */}
    <line
      x1="4"
      y1="32"
      x2="10"
      y2="28"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.6"
    />
    <line
      x1="4"
      y1="32"
      x2="10"
      y2="36"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.6"
    />
    <line
      x1="14"
      y1="32"
      x2="18"
      y2="28"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.4"
    />
    <line
      x1="14"
      y1="32"
      x2="18"
      y2="36"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.4"
    />

    {/* Branch tips - right */}
    <line
      x1="60"
      y1="32"
      x2="54"
      y2="28"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.6"
    />
    <line
      x1="60"
      y1="32"
      x2="54"
      y2="36"
      stroke="currentColor"
      strokeWidth="1.2"
      opacity="0.6"
    />
    <line
      x1="50"
      y1="32"
      x2="46"
      y2="28"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.4"
    />
    <line
      x1="50"
      y1="32"
      x2="46"
      y2="36"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.4"
    />

    {/* Center crystal */}
    <circle cx="32" cy="32" r="4" fill="currentColor" opacity="0.25" />
    <circle cx="32" cy="32" r="2" fill="currentColor" opacity="0.5" />
  </svg>
);
