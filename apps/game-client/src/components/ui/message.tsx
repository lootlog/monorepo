import type { ComponentProps } from "react";
import { cn } from "cn";

export function Message({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="message"
      className={cn(
        "ll:group/message ll:relative ll:w-full ll:min-w-0 ll:max-w-full ll:box-border ll:text-[length:var(--ll-chat-font-size)] ll:leading-[var(--ll-chat-line-height)] ll:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
