import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps } from "react";
import { Spinner } from "@/components/ui/spinner";

const buttonVariants = cva(
  "ll:inline-flex ll:shrink-0 ll:items-center ll:justify-center ll:gap-1.5 ll:whitespace-nowrap ll:rounded-sm ll:border ll:border-transparent ll:text-[13px] ll:font-medium ll:transition-[background-color,color,border-color,box-shadow,scale] ll:outline-none ll:active:scale-96 ll:disabled:pointer-events-none ll:disabled:opacity-50 ll:focus-visible:border-ring ll:focus-visible:ring-[3px] ll:focus-visible:ring-ring/50 ll:aria-invalid:border-destructive ll:aria-invalid:ring-destructive/20 ll:[&_svg]:pointer-events-none ll:[&_svg]:shrink-0 ll:[&_svg:not([class*=size-])]:size-3.5 ll-custom-cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "ll:bg-primary ll:text-primary-foreground ll:hover:bg-primary/90",
        destructive:
          "ll:bg-destructive/60 ll:text-white ll:hover:bg-destructive/70 ll:focus-visible:ring-destructive/40",
        outline:
          "ll:border-input ll:bg-input/30 ll:text-foreground ll:hover:bg-accent ll:hover:text-accent-foreground",
        secondary:
          "ll:bg-secondary ll:text-secondary-foreground ll:hover:bg-secondary/80",
        ghost:
          "ll:text-foreground ll:hover:bg-accent/50 ll:hover:text-accent-foreground",
        link: "ll:text-primary ll:underline-offset-4 ll:hover:underline",
        quiet:
          "ll:text-gray-400 ll:hover:bg-white/8 ll:hover:text-gray-100 ll:aria-expanded:bg-white/10 ll:aria-expanded:text-white ll:aria-pressed:text-blue-400 ll:aria-pressed:hover:text-blue-300",
        "quiet-destructive":
          "ll:text-gray-400 ll:hover:bg-destructive/15 ll:hover:text-destructive",
        taskbar:
          "ll:text-gray-300 ll:hover:bg-white/10 ll:hover:text-white ll:aria-expanded:bg-white/15 ll:aria-expanded:text-white ll:aria-pressed:bg-white/15 ll:aria-pressed:text-white ll:aria-pressed:shadow-[inset_0_-2px_0_var(--ll-color-blue-400)]",
        menu: "ll-action-menu-item ll:active:scale-100 ll:h-auto ll:min-h-7 ll:justify-start ll:px-2 ll:py-1.5 ll:text-xs ll:font-semibold ll:text-popover-foreground ll:hover:bg-muted ll:focus-visible:bg-muted ll:disabled:text-muted-foreground",
      },
      size: {
        default:
          "ll:h-8 ll:px-3 ll:[&>svg:first-child]:-ml-0.5 ll:[&>svg:last-child]:-mr-0.5",
        sm: "ll:h-7 ll:px-2 ll:text-xs ll:[&>svg:first-child]:-ml-0.5 ll:[&>svg:last-child]:-mr-0.5",
        xs: "ll:h-6 ll:px-1.5 ll:text-xs ll:[&>svg:first-child]:-ml-0.5 ll:[&>svg:last-child]:-mr-0.5",
        icon: "ll:size-8",
        "icon-sm": "ll:size-7",
        "icon-xs": "ll:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<typeof ButtonPrimitive> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export const Button = ({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  onMouseDown,
  ...props
}: ButtonProps) => {
  const handleMouseDown: ButtonProps["onMouseDown"] = (event) => {
    event.stopPropagation();
    onMouseDown?.(event);
  };

  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant ?? "default"}
      className={cn(
        buttonVariants({ variant, size }),
        loading && "ll:relative",
        className,
      )}
      onMouseDown={handleMouseDown}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
    >
      {loading ? (
        <>
          <span
            aria-hidden
            className="ll:absolute ll:inset-0 ll:flex ll:items-center ll:justify-center ll:animate-in ll:fade-in-0 ll:duration-150"
          >
            <Spinner />
          </span>
          <span className="ll:contents ll:invisible">{children}</span>
        </>
      ) : (
        children
      )}
    </ButtonPrimitive>
  );
};
