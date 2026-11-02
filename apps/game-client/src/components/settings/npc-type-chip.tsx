import { useNpcTypeColors } from "@/features/settings/persistence/use-appearance-settings";
import { getNotificationColors } from "@/utils/notifications-and-detector/background";
import { cn } from "cn";
import type { FC, ReactNode } from "react";

type NpcTypeChipProps = {
  /** NPC type key as used by the colour palette, e.g. "HERO". */
  npcType: string;
  children: ReactNode;
  className?: string;
};

/**
 * NPC type label: a dot in the type's palette colour followed by the name in
 * the regular text colour. Replaces colouring the whole label.
 */
export const NpcTypeChip: FC<NpcTypeChipProps> = ({
  npcType,
  children,
  className,
}) => {
  const { npcTypeColors } = useNpcTypeColors();
  const color = getNotificationColors(npcType, true, npcTypeColors).text;

  return (
    <span
      className={cn("ll:inline-flex ll:items-center ll:gap-1.5", className)}
    >
      <span
        aria-hidden
        className="ll:size-2 ll:shrink-0 ll:rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="ll:min-w-0 ll:truncate">{children}</span>
    </span>
  );
};
