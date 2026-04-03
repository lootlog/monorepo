import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";

const iconColorMap = {
  primary: {
    bg: "bg-primary/10 shadow-inner shadow-primary/10",
    text: "text-primary",
  },
  blue: {
    bg: "bg-blue-500/10 shadow-inner shadow-blue-500/10",
    text: "text-blue-500",
  },
  red: {
    bg: "bg-red-500/10 shadow-inner shadow-red-500/10",
    text: "text-red-500",
  },
  amber: {
    bg: "bg-amber-500/10 shadow-inner shadow-amber-500/10",
    text: "text-amber-500",
  },
  green: {
    bg: "bg-green-500/10 shadow-inner shadow-green-500/10",
    text: "text-green-500",
  },
  yellow: {
    bg: "bg-yellow-500/10 shadow-inner shadow-yellow-500/10",
    text: "text-yellow-500",
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
    <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`rounded-xl p-2.5 ${colors.bg}`}>
          <Icon className={`size-4 ${colors.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          <p className="text-xs leading-tight text-muted-foreground">
            {description}
          </p>
        </div>
        {actions}
      </div>
    </Card>
  );
};
