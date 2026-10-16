import { BandSection } from "@/components/common/band-section";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Inbox } from "lucide-react";
import { useId, type ReactNode } from "react";

type ChartSectionProps = {
  title: string;
  description?: string;
  /** A control at the end of the band, such as a chart/table toggle. */
  actions?: ReactNode;
  isLoading?: boolean;
  /** Shown instead of the content when there is nothing to show. */
  emptyMessage?: string;
  children: ReactNode;
};

/**
 * One chart of a statistics page under a banded heading, edge to edge like
 * the page's other sections, with its loading and empty states.
 */
export const ChartSection = ({
  title,
  description,
  actions,
  isLoading = false,
  emptyMessage,
  children,
}: ChartSectionProps) => (
  <BandSection
    id={useId()}
    title={title}
    description={description}
    trailing={actions}
    wide
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
