import type { ReactNode } from "react";
import { Card, CardContent } from "@lootlog/ui/components/card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

type Props = { className?: string } & (
  | { loading: true }
  | {
      loading?: false;
      icon: ReactNode;
      iconBg: string;
      iconColor: string;
      label: string;
      value: number;
    }
);
export function StatsOverviewCard(props: Props) {
  const { className } = props;
  if (props.loading)
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-6 w-10" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  const { icon, iconBg, iconColor, label, value } = props;
  return (
    <Card className={cn("border-border/80", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-lg",
              iconBg,
              iconColor,
            )}
          >
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xl font-bold tabular-nums">
              {value.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
