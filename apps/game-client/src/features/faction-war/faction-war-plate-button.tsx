import type { FC } from "react";
import { getFactionWarNeutralButtonUrl } from "./faction-war-assets";

/** The plain forged plate at the bottom centre: "Nie teraz" or "Zamknij". */
export const FactionWarPlateButton: FC<{
  warId: string;
  label: string;
  onClick: () => void;
}> = ({ warId, label, onClick }) => (
  <button type="button" className="ll-fw-dismiss" onClick={onClick}>
    <img
      className="ll-fw-cta-plate"
      src={getFactionWarNeutralButtonUrl(warId) ?? undefined}
      alt=""
      draggable={false}
    />
    <span className="ll-fw-cta-label">{label}</span>
  </button>
);
