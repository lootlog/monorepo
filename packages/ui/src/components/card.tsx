import * as React from "react";

import { cn } from "@lootlog/ui/lib/utils";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 11) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const PAW_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cellipse cx='16' cy='21' rx='6.5' ry='5' fill='white'/%3E%3Ccircle cx='7' cy='11' r='3' fill='white'/%3E%3Ccircle cx='13' cy='7' r='2.8' fill='white'/%3E%3Ccircle cx='19' cy='7' r='2.8' fill='white'/%3E%3Ccircle cx='25' cy='11' r='3' fill='white'/%3E%3C/svg%3E";

const CAT_CLASSES = ["cat-pink", "cat-purple", "cat-blue"];

function useCatTheme() {
  const [isCat, setIsCat] = React.useState(() => {
    if (typeof document === "undefined") return false;
    return CAT_CLASSES.some((c) => document.documentElement.classList.contains(c));
  });

  React.useEffect(() => {
    const root = document.documentElement;
    const check = () =>
      setIsCat(CAT_CLASSES.some((c) => root.classList.contains(c)));
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isCat;
}

function CatPawOverlay() {
  const isCatTheme = useCatTheme();
  const id = React.useId();

  if (!isCatTheme) return null;
  const paws = React.useMemo(() => {
    const rand = seededRandom(hashString(id));
    const count = 3 + Math.floor(rand() * 3);
    const placed: { x: number; y: number; r: number }[] = [];

    const result: {
      left: string;
      top: string;
      size: number;
      rotation: number;
      opacity: number;
    }[] = [];

    for (let i = 0; i < count; i++) {
      const size = 80 + rand() * 120;
      const radius = size / 2;

      let x: number;
      let y: number;
      let attempts = 0;
      let overlaps: boolean;

      do {
        x = rand() * 90;
        y = rand() * 85;
        overlaps = placed.some((p) => {
          const dx = x - p.x;
          const dy = y - p.y;
          const minDist = ((radius + p.r) / 200) * 100;
          return dx * dx + dy * dy < minDist * minDist;
        });
        attempts++;
      } while (overlaps && attempts < 20);

      if (!overlaps) {
        placed.push({ x, y, r: radius });
        result.push({
          left: `${x}%`,
          top: `${y}%`,
          size,
          rotation: -30 + rand() * 60,
          opacity: 0.04 + rand() * 0.04,
        });
      }
    }

    return result;
  }, [id]);

  return (
    <div
      data-slot="cat-paw-overlay"
      className="cat-paw-overlay"
      aria-hidden="true"
    >
      {paws.map((paw, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: paw.left,
            top: paw.top,
            width: paw.size,
            height: paw.size,
            transform: `rotate(${paw.rotation}deg)`,
            opacity: paw.opacity,
            backgroundImage: `url("${PAW_SVG}")`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}

function Card({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground relative flex flex-col gap-6 overflow-hidden rounded-xl border py-6 shadow-sm",
        className,
      )}
      {...props}
    >
      <CatPawOverlay />
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
