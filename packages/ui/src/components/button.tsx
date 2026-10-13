import { buttonVariants } from "@lootlog/ui/lib/button-variants";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { ButtonLoadingContent } from "@lootlog/ui/components/button-loading-content";
import { Spinner } from "@lootlog/ui/components/spinner";

import { cn } from "cn";

function Button({
  className,
  variant,
  size,
  loading,
  icon,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    icon?: ReactNode;
  }) {
  const hasIndicator = loading !== undefined || icon !== undefined;
  const isIconButton = size?.startsWith("icon") ?? false;

  const overlaysSpinner =
    (isIconButton && hasIndicator) || (loading !== undefined && !icon);

  const indicator = (
    <span
      aria-hidden="true"
      className="relative inline-grid size-4 shrink-0 place-items-center"
    >
      <span className={cn("inline-flex", loading && "opacity-0")}>{icon}</span>
      {loading && (
        <Spinner className="absolute size-4 motion-reduce:animate-none" />
      )}
    </span>
  );

  const content = overlaysSpinner ? (
    <ButtonLoadingContent loading={loading}>
      {isIconButton ? (children ?? icon) : children}
    </ButtonLoadingContent>
  ) : (
    <>
      {hasIndicator && indicator}
      {children}
    </>
  );

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        // The spinner overlays the hidden children, so the button keeps its size.
        overlaysSpinner && "relative",
        overlaysSpinner &&
          loading &&
          "[&>:not([data-button-spinner])]:opacity-0",
        buttonVariants({ variant, size, className }),
      )}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
    >
      {content}
    </ButtonPrimitive>
  );
}

export { Button };
