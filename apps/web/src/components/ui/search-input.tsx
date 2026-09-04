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
    <InputGroup className={cn(wrapperClassName, className)}>
      <InputGroupAddon>
        <Search aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        {...props}
        type="search"
        ref={ref}
        className={className}
      />
      {endAdornment ? (
        <InputGroupAddon align="inline-end">{endAdornment}</InputGroupAddon>
      ) : null}
    </InputGroup>
  );
});

SearchInput.displayName = "SearchInput";

export { SearchInput };
