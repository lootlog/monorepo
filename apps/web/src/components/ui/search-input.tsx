import { Search } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "cn";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@lootlog/ui/components/input-group";

export type SearchProps = React.InputHTMLAttributes<HTMLInputElement>;

const SearchInput = forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    wrapperClassName?: string;
    endAdornment?: ReactNode;
  }
>(({ className, wrapperClassName, endAdornment, ...props }, ref) => {
  return (
    <InputGroup
      className={cn(
        "has-[>[data-align=inline-start]]:[&>input]:pl-2 rounded-xl border-border bg-background dark:bg-background hover:border-foreground/20 hover:bg-foreground/[0.04] dark:hover:bg-foreground/[0.04]",
        wrapperClassName,
        className,
      )}
    >
      <InputGroupAddon className="pl-3">
        <Search aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        {...props}
        type="search"
        ref={ref}
        className={className}
      />
      {endAdornment ? (
        <InputGroupAddon align="inline-end" className="pr-3">
          {endAdornment}
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
});

SearchInput.displayName = "SearchInput";

export { SearchInput };
