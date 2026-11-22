import { deriveNpcSurfaceColors } from "@lootlog/domain/npc-appearance";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type NpcColorPreviewChipProps = {
  color: string;
  children: ReactNode;
  className?: string;
};

export const NpcColorPreviewChip: FC<NpcColorPreviewChipProps> = ({
  color,
  children,
  className,
}) => {
  const surfaceColors = deriveNpcSurfaceColors(color);

  return (
    <span
      aria-hidden
      className={cn(
        "ll:inline-flex ll:max-w-32 ll:items-center ll:truncate ll:rounded-sm ll:px-1.5 ll:py-0.5 ll:text-xs ll:font-semibold ll:leading-4",
        className,
      )}
      style={{
        color: surfaceColors.text,
        backgroundColor: surfaceColors.background,
        boxShadow: `inset 0 0 0 1px ${surfaceColors.border}`,
      }}
    >
      {children}
    </span>
  );
};
