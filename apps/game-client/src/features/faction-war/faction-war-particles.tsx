import type { FC } from "react";

const TILES = [0, 1, 2] as const;

/**
 * A particle scatter drifting forever: three stacked copies of a square
 * sprite slide by one tile and wrap, so the loop has no seam. Only the
 * track's transform animates.
 */
export const FactionWarParticles: FC<{
  src: string;
  drift: "rise" | "fall";
}> = ({ src, drift }) => (
  <div className="ll-fw-particles" data-drift={drift} aria-hidden="true">
    <div className="ll-fw-particles-track">
      {TILES.map((tile) => (
        <img
          key={tile}
          className="ll-fw-particle"
          src={src}
          alt=""
          decoding="async"
          draggable={false}
        />
      ))}
    </div>
  </div>
);
