import { useState } from "react";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { cn } from "cn";

type NpcPortraitProps = {
  icon: string | null | undefined;
  size: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: { box: "size-16", scale: 1, limit: 56, lift: "mb-1" },
  md: { box: "size-24", scale: 1, limit: 80, lift: "mb-2" },
  lg: { box: "h-44 w-full", scale: 2, limit: 152, lift: "mb-3" },
} as const;

export function NpcPortrait({ icon, size, className }: NpcPortraitProps) {
  const [natural, setNatural] = useState<{ width: number; height: number }>();
  const { box, scale, limit, lift } = SIZES[size];

  const measure = (image: HTMLImageElement) => {
    if (natural?.width === image.naturalWidth) return;

    setNatural({ width: image.naturalWidth, height: image.naturalHeight });
  };

  const fit = natural
    ? Math.max(
        1,
        Math.min(
          scale,
          Math.floor(limit / Math.max(natural.width, natural.height)),
        ),
      )
    : 1;

  const shrink = natural
    ? Math.min(1, limit / Math.max(natural.width, natural.height))
    : 1;

  return (
    <div
      className={cn(
        "relative isolate flex shrink-0 items-end justify-center overflow-hidden rounded-lg border border-border/60 bg-[radial-gradient(70%_60%_at_50%_70%,color-mix(in_oklab,var(--npc-accent,var(--primary))_14%,var(--background)),var(--background))]",
        box,
        className,
      )}
    >
      {icon ? (
        <div className={cn("relative", lift)}>
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-1/2 -z-10 aspect-[10/1] w-[90%] -translate-x-1/2 translate-y-1/3 rounded-[50%] bg-black/45 blur-[3px]"
          />
          <img
            src={npcIconUrl(icon)}
            alt=""
            loading="lazy"
            ref={(image) => {
              if (image?.complete && image.naturalWidth > 0) measure(image);
            }}
            onLoad={({ currentTarget }) => measure(currentTarget)}
            width={natural ? natural.width * fit * shrink : undefined}
            height={natural ? natural.height * fit * shrink : undefined}
            className={cn(
              "block [image-rendering:pixelated] transition-opacity duration-200 motion-reduce:transition-none",
              natural ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      ) : null}
    </div>
  );
}
