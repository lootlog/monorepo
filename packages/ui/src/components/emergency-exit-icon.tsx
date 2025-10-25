import { forwardRef } from "react";
import { cn } from "../lib/utils.js";

export interface EmergencyExitIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const EmergencyExitIcon = forwardRef<
  SVGSVGElement,
  EmergencyExitIconProps
>(({ size = 24, className, ...props }, ref) => {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      {...props}
    >
      <circle cx="9" cy="4" r="2" />
      <path d="M9 7v6" />
      <path d="M9 13l3 3" />
      <path d="M9 13l-3 3" />
      <path d="M12 16l2 5" />
      <path d="M6 16l-2 5" />
      <path d="M15 7h6" />
      <path d="M18 4l3 3-3 3" />
    </svg>
  );
});

EmergencyExitIcon.displayName = "EmergencyExitIcon";
