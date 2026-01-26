import { type MapStatus } from "../types";

interface MapStatusBadgeProps {
  status: MapStatus;
}

const STATUS_STYLES: Record<
  MapStatus,
  { bg: string; text: string; label: string }
> = {
  ASSIGNED_PRESENT: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    label: "Monitoruje",
  },
  ASSIGNED_ABSENT: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    label: "Nieobecny",
  },
  UNASSIGNED: {
    bg: "bg-gray-500/20",
    text: "text-gray-400",
    label: "Nieprzypisany",
  },
  WRONG_PLAYER: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    label: "Zły Gracz",
  },
};

export const MapStatusBadge = ({ status }: MapStatusBadgeProps) => {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {style.label}
    </span>
  );
};
