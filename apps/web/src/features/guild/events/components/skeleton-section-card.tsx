import type { ReactNode } from "react";
import { cn } from "cn";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";

export const SkeletonSectionCard = ({
  children,
  subtitleClassName = "h-5 w-24",
}: {
  children: ReactNode;
  subtitleClassName?: string;
}) => (
  <SectionCard className="border-border bg-card ">
    <SectionCardHeader title=<Skeleton className="h-4 w-32" /> />
    <SectionCardContent>
      <Skeleton className={cn("mb-3", subtitleClassName)} />
      {children}
    </SectionCardContent>
  </SectionCard>
);
