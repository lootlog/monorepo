import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

const iconColorMap = {
  primary: {
    bg: "bg-primary/12",
    text: "text-primary",
  },
  blue: {
    bg: "bg-signal-live/10",
    text: "text-signal-live",
  },
  red: {
    bg: "bg-signal-alert/10",
    text: "text-signal-alert",
  },
  amber: {
    bg: "bg-signal-timer/10",
    text: "text-signal-timer",
  },
  green: {
    bg: "bg-signal-ready/10",
    text: "text-signal-ready",
  },
  yellow: {
    bg: "bg-signal-timer/10",
    text: "text-signal-timer",
  },
} as const;

type PageHeaderProps = {
  icon: LucideIcon;
  iconColor?: keyof typeof iconColorMap;
  title: string;
  description: string;
  actions?: ReactNode;
};

export const PageHeader = ({
  icon: Icon,
  iconColor = "blue",
  title,
  description,
  actions,
}: PageHeaderProps) => {
  const colors = iconColorMap[iconColor];

  return (
    <header className="flex min-w-0 flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={`rounded-xl p-2.5 ${colors.bg}`}>
          <Icon className={`size-4 ${colors.text}`} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold leading-tight tracking-[-0.02em]">
            {title}
          </h1>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
};
