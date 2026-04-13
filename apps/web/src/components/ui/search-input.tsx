import { Search } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@lootlog/ui/lib/utils";
import { Input } from "@lootlog/ui/components/input";

export type SearchProps = React.InputHTMLAttributes<HTMLInputElement>;

const SearchInput = forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { wrapperClassName?: string }
>(({ className, wrapperClassName, ...props }, ref) => {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        {...props}
        type="search"
        ref={ref}
        className={cn("pl-9", className)}
      />
    </div>
  );
});

SearchInput.displayName = "SearchInput";

export { SearchInput };
