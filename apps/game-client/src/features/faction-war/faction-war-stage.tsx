import {
  useEffect,
  useRef,
  type FC,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { getFactionWarSeamUrl } from "./faction-war-assets";
import { useFactionWarKeyArtReady } from "./use-faction-war-key-art-ready";

export const FACTION_WAR_HEADING_ID = "ll-fw-heading";

type FactionWarStageProps = {
  warId: string;
  /** The screen's step, read by the `.ll-fw-*` rules as `data-state`. */
  state: string;
  onEscape: () => void;
  children: ReactNode;
};

/**
 * The faction war's modal stage over the middle of the game: both halves of
 * the war art at its 13:8 frame with the fire and ice seam between them. It
 * fades in once the key art decoded and keeps game hotkeys from firing
 * while it has focus.
 */
export const FactionWarStage: FC<FactionWarStageProps> = ({
  warId,
  state,
  onEscape,
  children,
}) => {
  const ready = useFactionWarKeyArtReady(warId);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();

    if (event.key === "Escape") onEscape();
  };

  return (
    <div
      ref={overlayRef}
      className="ll-fw-overlay"
      data-ready={ready}
      data-state={state}
      role="dialog"
      aria-modal="true"
      aria-labelledby={FACTION_WAR_HEADING_ID}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="ll-fw-stage">
        {children}
        <img
          className="ll-fw-seam"
          src={getFactionWarSeamUrl(warId) ?? undefined}
          alt=""
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
