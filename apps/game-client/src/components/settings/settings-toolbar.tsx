import { SearchInput } from "@/components/ui/search-input";
import { cn } from "cn";
import type { ComponentProps, FC, ReactNode } from "react";

type SettingsToolbarProps = {
  /** Search field props; the field always takes the remaining width. */
  search: Omit<ComponentProps<typeof SearchInput>, "className" | "size">;
  /** Filters after the search (`ToggleGroup`, `Select`s); each wraps on its own. */
  children?: ReactNode;
  className?: string;
};

/**
 * Search plus filters above a list (servers, mutes, logs). One row while it
 * fits; when the content column is narrow the search takes the full first
 * row and the filters wrap under it. The bottom margin keeps the list from
 * touching the field.
 */
export const SettingsToolbar: FC<SettingsToolbarProps> = ({
  search,
  children,
  className,
}) => (
  <search
    className={cn(
      "ll:mb-1.5 ll:flex ll:flex-wrap ll:items-center ll:gap-2 ll:px-2",
      className,
    )}
  >
    <SearchInput
      {...search}
      size="sm"
      className="ll:min-w-40 ll:flex-1 ll:basis-40"
    />
    {children}
  </search>
);
