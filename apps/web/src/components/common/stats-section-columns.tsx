import { useState, type ReactNode } from "react";
import { useMediaQuery } from "usehooks-ts";
import { cn } from "cn";
import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { useFillRemainingHeight } from "@/hooks/utils/use-fill-remaining-height";

type StatsSectionColumnsProps = {
  /** Column counts and spans past `xl`, such as `xl:grid-cols-2`. */
  className?: string;
  /**
   * The page's last columns: they stretch to the bottom of the screen, so the
   * rule between them does not stop short under shorter content.
   */
  fill?: boolean;
  children: ReactNode;
};

/**
 * Banded sections side by side from `xl`, one rule between them; narrower
 * pages stack them.
 */
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
