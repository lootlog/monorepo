import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import type { MapPingType } from "@lootlog/types";
import {
  MAP_PING_WHEEL_RADIUS_PX,
  mapPingInteractionController,
} from "./map-ping-interaction-controller";
import {
  getMapPingPresentation,
  MAP_PING_WHEEL_SEGMENTS,
} from "./map-ping-presentation";

const WHEEL_SIZE_PX = MAP_PING_WHEEL_RADIUS_PX * 2;
const WHEEL_CENTER_PX = MAP_PING_WHEEL_RADIUS_PX;
const WHEEL_INNER_RADIUS_PX = 24;
const SYMBOL_DISTANCE_PX = 56;
const SYMBOL_SIZE_PX = 9;

const getPointOnWheel = (radius: number, angle: number) => {
  const radians = (angle * Math.PI) / 180;
  return {
    x: WHEEL_CENTER_PX + Math.cos(radians) * radius,
    y: WHEEL_CENTER_PX + Math.sin(radians) * radius,
  };
};

const getSegmentPath = (centerAngle: number) => {
  const outerStart = getPointOnWheel(
    MAP_PING_WHEEL_RADIUS_PX,
    centerAngle - 45,
  );
  const outerEnd = getPointOnWheel(MAP_PING_WHEEL_RADIUS_PX, centerAngle + 45);
  const innerEnd = getPointOnWheel(WHEEL_INNER_RADIUS_PX, centerAngle + 45);
  const innerStart = getPointOnWheel(WHEEL_INNER_RADIUS_PX, centerAngle - 45);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${MAP_PING_WHEEL_RADIUS_PX} ${MAP_PING_WHEEL_RADIUS_PX} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${WHEEL_INNER_RADIUS_PX} ${WHEEL_INNER_RADIUS_PX} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
};

const getTypeTranslationKey = (type: MapPingType) =>
  getMapPingPresentation(type).translationKey;

export const MapPingWheel = () => {
  const snapshot = useSyncExternalStore(
    mapPingInteractionController.subscribe,
    mapPingInteractionController.getSnapshot,
  );
  const { t } = useTranslation("settings");

  if (!snapshot) {
    return null;
  }

  const selectedLabel = snapshot.selectedType
    ? t(getTypeTranslationKey(snapshot.selectedType))
    : t("mapPings.wheel.cancelHint");

  return (
    <div
      aria-label={t("mapPings.wheel.ariaLabel", {
        selection: selectedLabel,
      })}
      aria-live="polite"
      className="ll:fixed ll:h-[176px] ll:w-[176px] ll:select-none ll:animate-in ll:fade-in-0 ll:zoom-in-95 ll:duration-100"
      role="status"
      style={{
        left: snapshot.visualCenter.x - MAP_PING_WHEEL_RADIUS_PX,
        pointerEvents: "none",
        top: snapshot.visualCenter.y - MAP_PING_WHEEL_RADIUS_PX,
        zIndex: 2_147_483_000,
      }}
    >
      <svg
        aria-hidden="true"
        className="ll:h-full ll:w-full ll:overflow-visible ll:drop-shadow-[0_8px_20px_rgba(0,0,0,0.65)]"
        viewBox={`0 0 ${WHEEL_SIZE_PX} ${WHEEL_SIZE_PX}`}
      >
        {MAP_PING_WHEEL_SEGMENTS.map(({ angle, type }) => {
          const presentation = getMapPingPresentation(type);
          const selected = snapshot.selectedType === type;
          const symbolPoint = getPointOnWheel(SYMBOL_DISTANCE_PX, angle);

          return (
            <g
              data-selected={selected ? "true" : "false"}
              data-testid={`map-ping-segment-${type}`}
              key={type}
              style={{
                transform: selected ? "scale(1.08)" : "scale(1)",
                transformOrigin: `${WHEEL_CENTER_PX}px ${WHEEL_CENTER_PX}px`,
                transition: "opacity 100ms ease, transform 100ms ease",
              }}
            >
              <path
                d={getSegmentPath(angle)}
                fill={presentation.color}
                fillOpacity={selected ? 1 : 0.7}
                stroke={selected ? "#ffffff" : "rgba(0, 0, 0, 0.7)"}
                strokeWidth={selected ? 2 : 1}
              />
              <g
                fill="none"
                stroke="#ffffff"
                strokeLinecap="round"
                strokeWidth="3"
              >
                {type === "attention" ? (
                  <text
                    fill="#ffffff"
                    fontFamily="Arial"
                    fontSize="22"
                    fontWeight="700"
                    stroke="none"
                    textAnchor="middle"
                    x={symbolPoint.x}
                    y={symbolPoint.y + 7}
                  >
                    !
                  </text>
                ) : null}
                {type === "enemy" ? (
                  <>
                    <circle
                      cx={symbolPoint.x}
                      cy={symbolPoint.y}
                      r={SYMBOL_SIZE_PX - 3}
                    />
                    <path
                      d={`M ${symbolPoint.x - SYMBOL_SIZE_PX} ${symbolPoint.y} H ${symbolPoint.x + SYMBOL_SIZE_PX} M ${symbolPoint.x} ${symbolPoint.y - SYMBOL_SIZE_PX} V ${symbolPoint.y + SYMBOL_SIZE_PX}`}
                    />
                  </>
                ) : null}
                {type === "regroup" ? (
                  <>
                    <circle
                      cx={symbolPoint.x}
                      cy={symbolPoint.y}
                      r={SYMBOL_SIZE_PX}
                    />
                    <circle
                      cx={symbolPoint.x}
                      cy={symbolPoint.y}
                      r={SYMBOL_SIZE_PX / 2}
                    />
                  </>
                ) : null}
                {type === "avoid" ? (
                  <path
                    d={`M ${symbolPoint.x - SYMBOL_SIZE_PX} ${symbolPoint.y - SYMBOL_SIZE_PX} L ${symbolPoint.x + SYMBOL_SIZE_PX} ${symbolPoint.y + SYMBOL_SIZE_PX} M ${symbolPoint.x + SYMBOL_SIZE_PX} ${symbolPoint.y - SYMBOL_SIZE_PX} L ${symbolPoint.x - SYMBOL_SIZE_PX} ${symbolPoint.y + SYMBOL_SIZE_PX}`}
                  />
                ) : null}
              </g>
            </g>
          );
        })}
        <circle
          cx={WHEEL_CENTER_PX}
          cy={WHEEL_CENTER_PX}
          fill="rgba(9, 9, 11, 0.94)"
          r={WHEEL_INNER_RADIUS_PX}
          stroke="rgba(255, 255, 255, 0.35)"
        />
      </svg>
      <div className="ll:absolute ll:left-1/2 ll:top-1/2 ll:flex ll:h-12 ll:w-12 ll:-translate-x-1/2 ll:-translate-y-1/2 ll:items-center ll:justify-center ll:px-1 ll:text-center ll:text-[8px] ll:font-bold ll:leading-tight ll:text-white">
        {selectedLabel}
      </div>
    </div>
  );
};
