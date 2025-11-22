import type { FC } from "react";
import { Info } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";

export interface ReservationCardProps {
  name: string;
  title: string;
  size: string;
  images?: string[];
  maps?: string[];
  onClick: () => void;
}

export const ReservationCard: FC<ReservationCardProps> = ({
  title,
  size,
  images,
  maps,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border-2 p-4 transition-all overflow-visible cursor-pointer bg-card",
        "hover:shadow-md hover:scale-[1.02]",
        "border-border hover:border-primary/50",
      )}
    >
      {images && images.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {images.slice(0, 4).map((gif, idx) => (
            <div
              key={idx}
              className="relative h-16 w-16 rounded-md overflow-hidden"
            >
              <img
                src={gif}
                alt={`${title} gif ${idx + 1}`}
                className="h-full w-full object-contain"
              />
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 text-left">
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">
          Aktualnie zapisów: {size}
        </p>
      </div>

      {maps && maps.length > 0 && (
        <div className="absolute bottom-2 right-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  className="p-1 hover:bg-background/50 rounded transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <div className="font-semibold mb-2">Lista map:</div>
                  {maps.map((map, idx) => (
                    <div key={idx}>• {map}</div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </button>
  );
};
