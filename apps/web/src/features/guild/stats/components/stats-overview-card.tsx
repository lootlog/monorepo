import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import type { ReactNode } from "react";

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
      <SectionCard className={className}>
        <SectionCardHeader title={<Skeleton className="h-4 w-24" />} />
        <SectionCardContent>
          <Skeleton className="h-6 w-10" />
        </SectionCardContent>
      </SectionCard>
    );
  const { icon, iconBg, iconColor, label, value } = props;
  return (
    <SectionCard className={className}>
      <SectionCardHeader
        title={
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded",
                iconBg,
                iconColor,
              )}
            >
              {icon}
            </span>
            {label}
          </span>
        }
      />
      <SectionCardContent>
        <p className="text-xl font-bold tabular-nums">
          {value.toLocaleString()}
        </p>
      </SectionCardContent>
    </SectionCard>
  );
}
