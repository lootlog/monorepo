import { BandSection } from "@/components/common/band-section";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Inbox } from "lucide-react";
import { useId, type ReactNode } from "react";

type ChartSectionProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  flush?: boolean;
  children: ReactNode;
};

export const ChartSection = ({
  title,
  description,
  actions,
  isLoading = false,
  emptyMessage,
  flush = false,
  children,
}: ChartSectionProps) => (
  <BandSection
    id={useId()}
    title={title}
    description={description}
    trailing={actions}
    wide
    tiled={flush}
  >
    {isLoading ? (
      <Skeleton aria-busy className="h-64 w-full rounded-lg" />
    ) : emptyMessage ? (
      <EmptyState icon={Inbox} title={emptyMessage} compact />
    ) : (
      children
    )}
  </BandSection>
);
