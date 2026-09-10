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
  const expandsForSpinner = loading !== undefined && !icon;

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

  let content = (
    <>
      {hasIndicator && indicator}
      {children}
    </>
  );

  if (size === "icon" && hasIndicator) {
    content = (
      <span className="relative inline-grid place-items-center">
        <span className={cn("inline-flex", loading && "opacity-0")}>
          {children ?? icon}
        </span>
        {loading && (
          <span aria-hidden="true" className="absolute inline-flex">
            <Spinner className="size-4 motion-reduce:animate-none" />
          </span>
        )}
      </span>
    );
  } else if (expandsForSpinner) {
    content = (
      <ButtonLoadingContent loading={loading}>{children}</ButtonLoadingContent>
    );
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
    >
      {content}
    </ButtonPrimitive>
  );
}

export { Button };
