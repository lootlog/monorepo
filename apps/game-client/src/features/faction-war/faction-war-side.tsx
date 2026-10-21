import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import type { FC, ReactNode } from "react";
import { getFactionWarAssetUrl } from "./faction-war-assets";
import { FactionWarParticles } from "./faction-war-particles";
import { FACTION_SIDES, getFactionStyle } from "./faction-war-presentation";

export type FactionSideEmphasis =
  | "none"
  | "active"
  | "muted"
  | "chosen"
  | "lost";

type FactionWarSideProps = {
  warId: string;
  faction: FactionWarFaction;
  /** "chosen" lights the half up, "lost" greys it, "muted" shades it. */
  emphasis: FactionSideEmphasis;
  /** False under reduced motion: no particles, bursts or cracks. */
  motion: boolean;
  /** The half's crest and actions, over its art. */
  children: ReactNode;
};

/** One faction's half of the stage: its backdrop, character and effects. */
export const FactionWarSide: FC<FactionWarSideProps> = ({
  warId,
  faction,
  emphasis,
  motion,
  children,
}) => {
  const asset = (name: Parameters<typeof getFactionWarAssetUrl>[2]) =>
    getFactionWarAssetUrl(warId, faction, name) ?? undefined;

  return (
    <div
      className="ll-fw-side"
      data-side={FACTION_SIDES[faction]}
      data-emphasis={emphasis}
      style={getFactionStyle(faction)}
    >
      <div className="ll-fw-art" aria-hidden="true">
        <img
          className="ll-fw-backdrop"
          src={asset("backdrop")}
          alt=""
          draggable={false}
        />
        {motion ? (
          <FactionWarParticles
            src={asset("particles") ?? ""}
            drift={faction === "BARBATOS" ? "rise" : "fall"}
          />
        ) : null}
        {motion ? (
          <img className="ll-fw-cracks" src={asset("cracks")} alt="" />
        ) : null}
        <div className="ll-fw-figure">
          <div className="ll-fw-breathe">
            <img className="ll-fw-aura" src={asset("aura")} alt="" />
            {motion ? (
              <img className="ll-fw-rim" src={asset("character")} alt="" />
            ) : null}
            <img
              className="ll-fw-character"
              src={asset("character")}
              alt=""
              draggable={false}
            />
            {motion ? (
              <>
                <img className="ll-fw-burst" src={asset("burst")} alt="" />
                <img className="ll-fw-spray" src={asset("particles")} alt="" />
              </>
            ) : null}
          </div>
        </div>
        <div className="ll-fw-dim" />
        <div className="ll-fw-scrim" />
      </div>
      {children}
    </div>
  );
};
