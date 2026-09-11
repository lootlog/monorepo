import { deriveNpcSurfaceColors } from "@lootlog/domain/npc-appearance";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type NpcColorPreviewChipProps = {
  /** Accent HEX colour of the NPC type. */
  color: string;
  children: ReactNode;
  className?: string;
};

/**
 * Renders a label the way the chat, notifications and the detector paint an
 * NPC type: readable text on the tinted surface with the accent border.
 */
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
        "ll:inline-flex ll:max-w-32 ll:items-center ll:truncate ll:rounded-sm ll:px-1.5 ll:py-0.5 ll:text-[11px] ll:font-semibold ll:leading-4",
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
