import { Input, type InputSize } from "@/components/ui/input";
import { cn } from "cn";
import { Search, X } from "lucide-react";
import { forwardRef, type ComponentProps } from "react";

type SearchInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "variant" | "size" | "placeholder" | "value"
> & {
  value: string;
  placeholder: string;
  size?: InputSize;
  /** Renders a clear button while the value is non-empty. */
  onClear?: () => void;
  clearLabel?: string;
  className?: string;
};

/**
 * Search field: filled input with a leading search icon and an optional clear
 * button. Every search box in the client shares this look.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { size = "md", value, onClear, clearLabel, className, ...props },
    ref,
  ) {
    const showClear = Boolean(onClear) && value.length > 0;

    return (
      <div className={cn("ll:relative ll:min-w-0 ll:flex-1", className)}>
        <Search
          className="ll:pointer-events-none ll:absolute ll:start-1.5 ll:top-1/2 ll:size-3.5 ll:-translate-y-1/2 ll:text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <Input
          ref={ref}
          type="text"
          variant="filled"
          size={size}
          value={value}
          autoComplete="off"
          spellCheck={false}
          className={cn("ll:ps-6", showClear ? "ll:pe-6" : "ll:pe-2")}
          {...props}
        />
        {showClear ? (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={onClear}
            className="ll-custom-cursor-pointer ll:absolute ll:end-1 ll:top-1/2 ll:flex ll:size-5 ll:-translate-y-1/2 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:text-muted-foreground ll:transition-[color,scale] ll:duration-150 ll:ease-out ll:hover:text-foreground ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:active:scale-[0.96]"
          >
            <X className="ll:size-3.5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  },
);
