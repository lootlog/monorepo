import { cn } from "cn";

type PixelSpriteProps = {
  src: string;
  className?: string;
};

export function PixelSprite({ src, className }: PixelSpriteProps) {
  return (
    <img
      src={src}
      alt=""
      className={cn("block max-w-none [image-rendering:pixelated]", className)}
    />
  );
}
