import type { ReactNode } from "react";
import { Card } from "@lootlog/ui/components/card";
import { cn } from "@lootlog/ui/lib/utils";
import { ChevronRight } from "lucide-react";

interface SelectableListCardProps {
  isSelected: boolean;
  onClick: () => void;
  children: ReactNode;
  icons?: ReactNode;
  showIcons?: boolean;
  className?: string;
}

export const SelectableListCard = ({
  isSelected,
  onClick,
  children,
  icons,
  showIcons = true,
  className,
}: SelectableListCardProps) => {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-150",
        "bg-card/40 backdrop-blur-sm border-border",
        "hover:bg-card/80 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01] py-1",
        isSelected && "bg-primary/10 border-primary/50 shadow-lg scale-[1.01]",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex flex-wrap items-center gap-3 py-2 px-4 pl-5">
        {children}
        <ChevronRight
          className={cn(
            "size-4 text-muted-foreground shrink-0 transition-all duration-150 hidden md:block",
            "absolute right-3 top-1/2 -translate-y-1/2",
            "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
            isSelected && "opacity-100 translate-x-0 text-primary",
          )}
        />
        {icons && showIcons && (
          <div className="flex items-center gap-1 w-full md:w-auto md:order-none order-last mt-2 md:mt-0 ml-5 md:ml-0 md:mr-6">
            {icons}
          </div>
        )}
      </div>
    </Card>
  );
};
