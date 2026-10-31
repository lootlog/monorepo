import type { FC, ReactNode } from "react";
import { FACTION_WAR_HEADING_ID } from "./faction-war-stage";

/** The title block at the top centre of the stage, over the seam. */
export const FactionWarHeader: FC<{
  eyebrow: string;
  title: string;
  children: ReactNode;
}> = ({ eyebrow, title, children }) => (
  <header className="ll-fw-header">
    <div className="ll-fw-eyebrow">{eyebrow}</div>
    <h2 id={FACTION_WAR_HEADING_ID} className="ll-fw-heading">
      {title}
    </h2>
    {children}
  </header>
);
