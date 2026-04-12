import type { FC } from "react";
import { cn } from "@/utils/cn";

export const RiasBatSeparator: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn("flex items-center justify-center w-full py-1", className)}
    role="separator"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 200 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-40 h-4 text-primary/20"
    >
      {/* Left wing */}
      <path
        d="M100 12 Q85 4 70 6 Q55 2 40 8 Q25 3 10 10 Q20 10 30 12 Q20 14 10 14 Q25 18 40 14 Q55 20 70 16 Q85 18 100 12"
        fill="currentColor"
      />
      {/* Right wing (mirrored) */}
      <path
        d="M100 12 Q115 4 130 6 Q145 2 160 8 Q175 3 190 10 Q180 10 170 12 Q180 14 190 14 Q175 18 160 14 Q145 20 130 16 Q115 18 100 12"
        fill="currentColor"
      />
      {/* Center dot */}
      <circle cx="100" cy="12" r="2" fill="currentColor" opacity="0.8" />
    </svg>
  </div>
);
