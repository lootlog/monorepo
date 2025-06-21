import { Search } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/utils/cn";

export type SearchProps = React.InputHTMLAttributes<HTMLInputElement>;

const SearchInput = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn(
          "flex h-10 items-center rounded-md border border-input pl-3 text-sm ring-offset-background focus-within:ring-1 bg-background focus-within:ring-ring focus-within:ring-offset-2",
          className
        )}
      >
        <Search className="h-[16px] w-[16px]" />
        <input
          {...props}
          type="search"
          ref={ref}
          className="w-full bg-background p-2 placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
