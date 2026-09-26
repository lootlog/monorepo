import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import {
  PING_WHEEL_INNER_RADIUS_PX,
  PING_WHEEL_OUTER_RADIUS_PX,
  getPingRingAngle,
  pingInteractionController,
} from "./ping-interaction-controller";
import { PingPill } from "./ping-pill";
import {
  PING_ICONS,
  PING_TONES,
  getPingPresentation,
} from "./ping-presentation";

const OUTER = PING_WHEEL_OUTER_RADIUS_PX;

const INNER = PING_WHEEL_INNER_RADIUS_PX;

/** Room for the frame around the ring. */
const FRAME = 3;

const CENTER = OUTER + FRAME;

const SIZE = CENTER * 2;

const ICON_PX = 20;

/** Gap between wedges, in degrees on each side. */
const WEDGE_GAP_DEG = 1.5;

const pointAt = (radius: number, angleFromTop: number) => {
  const radians = ((angleFromTop - 90) * Math.PI) / 180;

  return {
    x: CENTER + Math.cos(radians) * radius,
    y: CENTER + Math.sin(radians) * radius,
  };
};

const circlePath = (radius: number) =>
  `M${CENTER - radius} ${CENTER}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 ${-radius * 2} 0`;

const wedgePath = (index: number, count: number) => {
  // A single option fills the whole ring.
  if (count === 1) {
    return `${circlePath(OUTER)}${circlePath(INNER)}`;
  }

  const step = 360 / count;
  const middle = getPingRingAngle(index, count);
  const start = middle - step / 2 + WEDGE_GAP_DEG;
  const end = middle + step / 2 - WEDGE_GAP_DEG;
  const largeArc = end - start > 180 ? 1 : 0;
  const outerStart = pointAt(OUTER, start);
  const outerEnd = pointAt(OUTER, end);
  const innerEnd = pointAt(INNER, end);
  const innerStart = pointAt(INNER, start);

  return [
    `M${outerStart.x} ${outerStart.y}`,
    `A${OUTER} ${OUTER} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L${innerEnd.x} ${innerEnd.y}`,
    `A${INNER} ${INNER} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join("");
};

type WheelIconProps = {
  color: string;
  icon: keyof typeof PING_ICONS;
  opacity: number;
  x: number;
  y: number;
};

const iconTransform = ({ x, y }: { x: number; y: number }) =>
  `translate(${x - ICON_PX / 2} ${y - ICON_PX / 2}) scale(${ICON_PX / 24})`;

const wheelIcon = ({ color, icon, opacity, x, y }: WheelIconProps) => (
  <path
    d={PING_ICONS[icon]}
    fill="none"
    opacity={opacity}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2.4}
    transform={iconTransform({ x, y })}
  />
);

export const PingWheel = () => {
  const snapshot = useSyncExternalStore(
    pingInteractionController.subscribe,
    pingInteractionController.getSnapshot,
  );

  const { t } = useTranslation("pings");

  if (!snapshot) {
    return null;
  }

  const { menu, selectedType, visualCenter } = snapshot;

  const selectedLabel = selectedType
    ? t(getPingPresentation(selectedType).translationKey)
    : null;

  const idleLabel = menu.title ?? t("wheel.cancelHint");
  const centre = menu.centre ? getPingPresentation(menu.centre) : null;
  const centreSelected = menu.centre !== null && selectedType === menu.centre;

  return (
    <div
      aria-label={t("wheel.ariaLabel", {
        selection: selectedLabel ?? t("wheel.cancelHint"),
      })}
      aria-live="polite"
      className="ll:fixed ll:select-none ll:animate-in ll:fade-in-0 ll:zoom-in-95 ll:duration-100 ll:motion-reduce:animate-none"
      role="status"
      style={{
        height: SIZE,
        left: visualCenter.x - CENTER,
        pointerEvents: "none",
        top: visualCenter.y - CENTER,
        width: SIZE,
        zIndex: 2_147_483_000,
      }}
    >
      <svg
        aria-hidden="true"
        className="ll:h-full ll:w-full ll:overflow-visible"
        style={{ filter: "drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6))" }}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        {/* The game's popup-menu frame: dark fill inside a light hairline. */}
        <path
          d={circlePath(OUTER + FRAME)}
          fill="#3f3b3d"
          stroke="#150f0d"
          strokeWidth={2}
        />
        <path
          d={circlePath(OUTER + FRAME - 1)}
          fill="none"
          stroke="#b6bbc1b0"
        />
        {menu.ring.map((type, index) => {
          const presentation = getPingPresentation(type);
          const tone = PING_TONES[presentation.tone];
          const selected = type === selectedType;

          const iconPoint = pointAt(
            (OUTER + INNER) / 2,
            getPingRingAngle(index, menu.ring.length),
          );

          return (
            <g key={type}>
              <path
                d={wedgePath(index, menu.ring.length)}
                fill={tone.fill}
                fillOpacity={selected ? 1 : 0.78}
                fillRule="evenodd"
                stroke={selected ? "#eddb5e" : tone.border}
                strokeWidth={selected ? 1.6 : 1}
              />
              {wheelIcon({
                color: selected ? "#ffffff" : "#cac094",
                icon: presentation.icon,
                opacity: selectedType === null || selected ? 1 : 0.6,
                ...iconPoint,
              })}
            </g>
          );
        })}
        <path
          d={circlePath(INNER - 3)}
          fill={centre ? PING_TONES[centre.tone].fill : "#1c1a1e"}
          stroke={centreSelected ? "#eddb5e" : "#150f0d"}
          strokeWidth={centreSelected ? 1.6 : 1}
        />
        {centre ? (
          wheelIcon({
            color: centreSelected ? "#ffffff" : "#cac094",
            icon: centre.icon,
            opacity: selectedType === null || centreSelected ? 1 : 0.6,
            x: CENTER,
            y: CENTER,
          })
        ) : (
          <circle cx={CENTER} cy={CENTER} fill="#cac094" r={3} />
        )}
      </svg>
      <PingPill
        style={{
          left: "50%",
          position: "absolute",
          top: "100%",
          transform: "translate(-50%, 4px)",
        }}
      >
        {selectedLabel ?? <span style={{ color: "#bebebe" }}>{idleLabel}</span>}
      </PingPill>
    </div>
  );
};
