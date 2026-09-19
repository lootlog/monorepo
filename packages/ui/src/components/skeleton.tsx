import { cn } from "cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-secondary animate-skeleton rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
