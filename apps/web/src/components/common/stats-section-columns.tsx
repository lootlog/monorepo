import { useState, type ReactNode } from "react";
import { useMediaQuery } from "usehooks-ts";
import { cn } from "cn";
import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { useFillRemainingHeight } from "@lootlog/ui/hooks/use-fill-remaining-height";

type StatsSectionColumnsProps = {
  className?: string;
  fill?: boolean;
  children: ReactNode;
};

export const StatsSectionColumns = ({
  className,
  fill = false,
  children,
}: StatsSectionColumnsProps) => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const isWide = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);
  const minHeight = useFillRemainingHeight(fill && isWide ? element : null, 0);

  return (
    <div
      ref={setElement}
      style={minHeight === undefined ? undefined : { minHeight }}
      className={cn(
        "grid min-w-0 grid-cols-1 *:min-w-0 xl:*:border-border xl:[&>*+*]:border-l",
        className,
      )}
    >
      {children}
    </div>
  );
};
