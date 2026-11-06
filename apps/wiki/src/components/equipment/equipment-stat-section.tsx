import type { ReactNode } from "react";

type EquipmentStatSectionProps = {
  id: string;
  title: string;
  /** Hides a section none of whose stats the set has. */
  hidden: boolean;
  children: ReactNode;
};

/** One section of the character window's stats: its heading over its rows. */
export function EquipmentStatSection({
  id,
  title,
  hidden,
  children,
}: EquipmentStatSectionProps) {
  return (
    <section
      aria-labelledby={id}
      hidden={hidden}
      className="flex flex-col gap-1"
    >
      <h3
        id={id}
        className="border-b border-border/50 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {title}
      </h3>
      <dl className="flex flex-col">{children}</dl>
    </section>
  );
}
