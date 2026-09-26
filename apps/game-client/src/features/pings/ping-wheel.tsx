import { useSyncExternalStore, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  PING_WHEEL_DEAD_ZONE_PX,
  PING_WHEEL_RING_RADIUS_PX,
  getPingRingAngle,
  pingInteractionController,
} from "./ping-interaction-controller";
import { PingIcon } from "./ping-icon";
import { PingPill } from "./ping-pill";
import {
  PING_TONES,
  getPingPresentation,
  type PingType,
} from "./ping-presentation";

const RING_TILE_PX = 34;

const CENTRE_TILE_PX = 30;

const tileStyle = (
  type: PingType,
  size: number,
  x: number,
  y: number,
  selected: boolean,
): CSSProperties => {
  const tone = PING_TONES[getPingPresentation(type).tone];

  return {
    background: tone.fill,
    boxShadow: [
      "0 0 0 1px #150f0d inset",
      `0 0 0 1px ${selected ? "#eddb5e" : tone.border}`,
      "0 0 0 2px #150f0d",
      selected ? `0 0 10px ${tone.border}` : "0 2px 6px rgba(0, 0, 0, 0.6)",
    ].join(", "),
    height: size,
    left: x,
    opacity: selected ? 1 : 0.85,
    top: y,
    transform: `translate(-50%, -50%) scale(${selected ? 1.22 : 1})`,
    width: size,
  };
};

export const PingWheel = () => {
  const snapshot = useSyncExternalStore(
    pingInteractionController.subscribe,
    pingInteractionController.getSnapshot,
  );

  const { t } = useTranslation("pings");

  if (!snapshot) {
    return null;
  }

  const { menu, pointer, selectedType, visualCenter } = snapshot;

  const selectedLabel = selectedType
    ? t(getPingPresentation(selectedType).translationKey)
    : t("wheel.cancelHint");

  const guideX = pointer.x - visualCenter.x;
  const guideY = pointer.y - visualCenter.y;
  const guideLength = Math.hypot(guideX, guideY);
  const guideScale = Math.min(1, PING_WHEEL_RING_RADIUS_PX / guideLength);

  const tiles = [
    ...(menu.centre
      ? [{ size: CENTRE_TILE_PX, type: menu.centre, x: 0, y: 0 }]
      : []),
    ...menu.ring.map((type, index) => {
      const radians =
        ((getPingRingAngle(index, menu.ring.length) - 90) * Math.PI) / 180;

      return {
        size: RING_TILE_PX,
        type,
        x: Math.cos(radians) * PING_WHEEL_RING_RADIUS_PX,
        y: Math.sin(radians) * PING_WHEEL_RING_RADIUS_PX,
      };
    }),
  ];

  return (
    <div
      aria-label={t("wheel.ariaLabel", { selection: selectedLabel })}
      aria-live="polite"
      className="ll:fixed ll:h-0 ll:w-0 ll:select-none"
      role="status"
      style={{
        left: visualCenter.x,
        pointerEvents: "none",
        top: visualCenter.y,
        zIndex: 2_147_483_000,
      }}
    >
      {guideLength > PING_WHEEL_DEAD_ZONE_PX ? (
        <svg
          aria-hidden="true"
          className="ll:absolute ll:left-0 ll:top-0 ll:overflow-visible"
          height="1"
          width="1"
        >
          <line
            opacity={0.8}
            stroke="#cac094"
            strokeDasharray="3 3"
            strokeWidth={2}
            x1={0}
            x2={guideX * guideScale}
            y1={0}
            y2={guideY * guideScale}
          />
        </svg>
      ) : null}
      {menu.centre ? null : (
        <div
          className="ll:absolute ll:h-2 ll:w-2 ll:rounded-full"
          style={{
            background: "#cac094",
            boxShadow: "0 0 0 2px #150f0d",
            left: -4,
            top: -4,
          }}
        />
      )}
      {tiles.map(({ size, type, x, y }) => {
        const selected = type === selectedType;
        const presentation = getPingPresentation(type);

        return (
          <div
            className="ll:absolute ll:grid ll:place-items-center ll:rounded-[4px] ll:transition-transform ll:duration-75 ll:motion-reduce:transition-none"
            data-selected={selected ? "true" : "false"}
            data-testid={`ping-option-${type}`}
            key={type}
            style={tileStyle(type, size, x, y, selected)}
          >
            <PingIcon
              color={selected ? "#ffffff" : "#cac094"}
              name={presentation.icon}
              size={18}
            />
            {selected ? (
              <PingPill
                style={{
                  bottom: "calc(100% + 6px)",
                  left: "50%",
                  position: "absolute",
                  transform: "translateX(-50%) scale(0.82)",
                }}
              >
                {t(presentation.translationKey)}
              </PingPill>
            ) : null}
          </div>
        );
      })}
      {menu.title ? (
        <PingPill
          style={{
            left: 0,
            position: "absolute",
            top: PING_WHEEL_RING_RADIUS_PX + RING_TILE_PX / 2 + 8,
            transform: "translateX(-50%)",
          }}
        >
          <span style={{ color: "#bebebe" }}>{menu.title}</span>
        </PingPill>
      ) : null}
    </div>
  );
};
