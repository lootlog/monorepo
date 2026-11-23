import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import * as React from "react";
import { cn } from "cn";

const Avatar = React.forwardRef<HTMLSpanElement, BaseAvatar.Root.Props>(
  ({ className, ...props }, ref) => (
    <BaseAvatar.Root
      ref={ref}
      className={cn(
        "ll:relative ll:flex ll:size-10 ll:shrink-0 ll:select-none ll:overflow-hidden ll:rounded-sm ll:bg-black/25 ll:text-xs ll:font-semibold ll:leading-none ll:text-foreground",
        className,
      )}
      {...props}
    />
  ),
);

Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<HTMLImageElement, BaseAvatar.Image.Props>(
  ({ className, ...props }, ref) => (
    <BaseAvatar.Image
      ref={ref}
      className={cn("ll:size-full ll:object-cover", className)}
      {...props}
    />
  ),
);

AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  BaseAvatar.Fallback.Props
>(({ className, ...props }, ref) => (
  <BaseAvatar.Fallback
    ref={ref}
    className={cn(
      "ll:flex ll:size-full ll:items-center ll:justify-center",
      className,
    )}
    {...props}
  />
));

AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
