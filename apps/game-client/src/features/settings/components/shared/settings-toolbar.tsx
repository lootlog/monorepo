import { SearchInput } from "@/components/ui/search-input";
import { cn } from "cn";
import type { ComponentProps, FC, ReactNode } from "react";

type SettingsToolbarProps = {
  search: Omit<ComponentProps<typeof SearchInput>, "className" | "size">;
  children?: ReactNode;
  className?: string;
};

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
