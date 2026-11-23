import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";

type NoticeTone = "destructive" | "neutral" | "warning";

const NOTICE_TONE_CLASS_NAMES = {
  destructive: "ll:border-destructive/40 ll:bg-destructive/10",
  neutral: "ll:border-border ll:bg-muted/60",
  warning: "ll:border-warning/40 ll:bg-warning/10",
} as const satisfies Record<NoticeTone, string>;

const NOTICE_ACCENT_CLASS_NAMES = {
  destructive: "ll:text-destructive",
  neutral: "ll:text-muted-foreground",
  warning: "ll:text-warning",
} as const satisfies Record<NoticeTone, string>;

type NoticeProps = ComponentProps<"div"> & {
  tone: NoticeTone;
  layout?: "inline" | "strip";
  icon?: ReactNode;
};

export const Notice = ({
  tone,
  layout = "inline",
  icon,
  className,
  children,
  ...props
}: NoticeProps) => (
  <div
    className={cn(
      "ll:items-center ll:gap-1.5 ll:border ll:border-solid ll:px-2 ll:py-1 ll:text-[11px] ll:leading-4 ll:text-foreground",
      layout === "strip"
        ? "ll:-mt-px ll:flex ll:min-h-7 ll:w-full ll:border-x-0"
        : "ll:inline-flex ll:rounded-sm",
      NOTICE_TONE_CLASS_NAMES[tone],
      className,
    )}
    {...props}
  >
    {icon ? (
      <span
        aria-hidden
        className={cn(
          "ll:flex ll:shrink-0 ll:[&_svg]:size-3",
          NOTICE_ACCENT_CLASS_NAMES[tone],
        )}
      >
        {icon}
      </span>
    ) : null}
    {children}
  </div>
);
