import { useState } from "react";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { cn } from "cn";

type NpcPortraitProps = {
  icon: string | null | undefined;
  /** The sprite's box; the sprite keeps its pixels sharp inside it. */
  size: "sm" | "md" | "lg";
  className?: string;
};

// The box, how many times a sprite that fits is enlarged in it, and how far
// it stands from the box's bottom edge.
const SIZES = {
  sm: { box: "size-16", scale: 1, limit: 56, lift: "mb-1" },
  md: { box: "size-24", scale: 1, limit: 88, lift: "mb-2" },
  lg: { box: "h-44 w-full", scale: 2, limit: 160, lift: "mb-3" },
} as const;

/**
 * A monster's sprite on a lit stage. Margonem draws sprites from 32 to
 * about 100 pixels; each shows at a whole multiple of its own size that fits
 * the box, so its pixels stay crisp. The shadow follows the sprite, not the
 * box, so it stays under the feet whatever shape the box takes.
 */
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

  // A sprite larger than the box still shrinks to fit it.
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
            // A sprite cached before hydration has loaded without an event.
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
