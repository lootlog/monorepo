import type { ReactNode } from "react";
import type { EquipmentSlotId } from "@/lib/equipment-slots";

const HAND = (
  <>
    <path d="M2 9h6l3.6-3.4a1.6 1.6 0 0 1 2.3 2.2L12 10h8.5a1.5 1.5 0 0 1 0 3H19a1.5 1.5 0 0 1 0 3h-1.5a1 1 0 0 1 0 2H2z" />
    <path d="M13 13h6M13 16h4.5" />
  </>
);

const GLOVE = (
  <>
    <path d="M2 16.5V7.5a3 3 0 0 1 6 0V12l1.8-1.8a1.4 1.4 0 0 1 2 2L8 16.5" />
    <path d="M5 4.5V9M1.5 16.5h7V21h-7z" />
  </>
);

const BOOT = "M0 0h5v9l3.4 1.6a2 2 0 0 1 1.1 1.8V15H0z";

const SLOT_ICONS: Record<EquipmentSlotId, ReactNode> = {
  helmet: (
    <>
      <path d="M5 21v-9a7 7 0 0 1 14 0v9z" />
      <path d="M8 12h8M12 12v5" />
    </>
  ),
  ring: (
    <>
      <circle cx="12" cy="15" r="6" />
      <path d="m12 3.5 2.5 2.5-2.5 2.5L9.5 6z" />
    </>
  ),
  necklace: (
    <>
      <path d="M5 3c0 6.5 3 10 7 10s7-3.5 7-10" />
      <circle cx="12" cy="17" r="3" />
    </>
  ),
  gloves: (
    <>
      <g transform="translate(0 1)">{GLOVE}</g>
      <g transform="translate(24 1) scale(-1 1)">{GLOVE}</g>
    </>
  ),
  weapon: <g transform="translate(24 0) scale(-1 1)">{HAND}</g>,
  armor: (
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
  ),
  secondary: HAND,
  blessing: (
    <>
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4M22 4h-4" />
    </>
  ),
  boots: (
    <>
      <path transform="translate(2.5 5)" d={BOOT} />
      <path transform="translate(12 5)" d={BOOT} />
    </>
  ),
};

type EquipmentSlotIconProps = {
  slot: EquipmentSlotId;
  className?: string;
};

export function EquipmentSlotIcon({ slot, className }: EquipmentSlotIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {SLOT_ICONS[slot]}
    </svg>
  );
}
