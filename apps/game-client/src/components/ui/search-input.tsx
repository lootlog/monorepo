import {
  Input,
  type InputSize,
  type InputVariant,
} from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
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
  variant?: Extract<InputVariant, "filled" | "borderless">;
  onClear: () => void;
  clearLabel: string;
  className?: string;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      size = "md",
      variant = "filled",
      value,
      onClear,
      clearLabel,
      className,
      ...props
    },
    ref,
  ) {
    const showClear = value.length > 0;

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
          variant={variant}
          size={size}
          value={value}
          autoComplete="off"
          spellCheck={false}
          className={cn("ll:ps-6", showClear ? "ll:pe-7" : "ll:pe-2")}
          {...props}
        />
        {showClear ? (
          <IconButton
            label={clearLabel}
            onClick={onClear}
            className="ll:absolute ll:end-0.5 ll:top-1/2 ll:-translate-y-1/2"
          >
            <X aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>
    );
  },
);
