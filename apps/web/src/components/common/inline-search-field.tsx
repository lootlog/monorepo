import { cn } from "cn";
import { Search, X } from "lucide-react";
import type { ReactNode, Ref } from "react";

/** The input inside an `InlineSearchField`, a plain one or a combobox's. */
export const INLINE_SEARCH_INPUT_CLASS =
  "h-8 min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:hidden";

type InlineSearchFieldProps = {
  /** The input, styled with `INLINE_SEARCH_INPUT_CLASS`. */
  children: ReactNode;
  /** Shows the clear button while the field has a value. */
  onClear?: () => void;
  clearLabel: string;
  className?: string;
  /** Anchors a list of suggestions under the whole field. */
  ref?: Ref<HTMLDivElement>;
};

/**
 * A borderless search that reads as part of the bar it opens, such as a list
 * toolbar or a filter bar, rather than as a second global search.
 */
export const InlineSearchField = ({
  children,
  onClear,
  clearLabel,
  className,
  ref,
}: InlineSearchFieldProps) => (
  <div
    ref={ref}
    data-slot="inline-search"
    className={cn(
      "flex min-w-48 flex-1 items-center gap-2 text-sm text-muted-foreground focus-within:text-foreground",
      className,
    )}
  >
    <Search aria-hidden="true" className="size-4 shrink-0" />
    {children}
    {onClear && (
      <button
        type="button"
        aria-label={clearLabel}
        onClick={onClear}
        className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    )}
  </div>
);
