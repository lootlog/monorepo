import type { FC } from "react";
import { Check, Eye } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";

export interface ThemeCardProps {
  name: string;
  title: string;
  description: string;
  colors: string[];
  image?: string;
  backgroundImage?: string;
  isActive: boolean;
  onClick: () => void;
}

export const ThemeCard: FC<ThemeCardProps> = ({
  title,
  description,
  colors,
  backgroundImage,
  isActive,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border-2 p-4 transition-all overflow-hidden cursor-pointer bg-card",
        "hover:shadow-md hover:scale-[1.02]",
        isActive
          ? "border-primary shadow-md ring-2 ring-primary ring-offset-2"
          : "border-border hover:border-input-focus",
      )}
    >
      {isActive && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground z-20 p-1 m-4">
          <Check className="h-4 w-4" />
        </div>
      )}

      {backgroundImage && (
        <div className="relative z-10 h-32 w-full rounded-md overflow-hidden border border-border mb-1 bg-muted">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                backgroundImage.startsWith("data:") ||
                backgroundImage.startsWith("http")
                  ? `url("${backgroundImage}")`
                  : `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-background backdrop-blur-sm border border-border shadow-sm">
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex gap-2">
        {colors.map((color, index) => (
          <div
            key={index}
            className="h-10 w-10 rounded-md border border-border shadow-sm"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="relative z-10 text-left">
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
};
