import type { FC } from "react";
import { Check } from "lucide-react";
import { cn } from "cn";

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
      data-slot="theme-card"
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border-2 p-4 transition-[border-color,box-shadow] cursor-pointer bg-card outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-4",
        "hover:shadow-md",
        isActive
          ? "border-primary shadow-md ring-2 ring-primary ring-inset"
          : "border-border hover:border-primary/50",
      )}
    >
      {isActive && (
        <div className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground z-20 p-1">
          <Check aria-hidden className="size-4" />
        </div>
      )}

      {backgroundImage && (
        <div
          aria-hidden
          className="relative z-10 h-32 w-full rounded-md overflow-hidden border border-border mb-1 bg-muted"
          style={{ backgroundColor: colors[2] }}
        >
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
        </div>
      )}

      <div aria-hidden className="relative z-10 flex gap-2">
        {colors.map((color, index) => (
          <div
            key={index}
            className="size-10 rounded-md border border-border shadow-sm"
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
