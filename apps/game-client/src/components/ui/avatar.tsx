import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import * as React from "react";
import { cn } from "cn";

const Avatar = React.forwardRef<HTMLSpanElement, BaseAvatar.Root.Props>(
  ({ className, ...props }, ref) => (
    <BaseAvatar.Root
      ref={ref}
      className={cn(
        "ll::relative ll::flex ll::h-10 ll::w-10 ll::shrink-0 ll::overflow-hidden ll::rounded-full",
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
      className={cn("ll::aspect-square ll::h-full ll::w-full", className)}
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
      "ll::flex ll::h-full ll::w-full ll::items-center ll::justify-center ll::rounded-full ll::bg-muted",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
