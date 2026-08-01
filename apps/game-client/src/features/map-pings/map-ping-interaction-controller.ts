import type { MapPingType } from "@lootlog/types";
import type { MapTile } from "./map-ping-controller";
import { setMeasuredTimeout } from "@/lib/performance-monitoring/measured-callback";

export const MAP_PING_HOLD_DELAY_MS = 300;
export const MAP_PING_WHEEL_RADIUS_PX = 88;
export const MAP_PING_WHEEL_DEAD_ZONE_PX = 24;
export const MAP_PING_WHEEL_MARGIN_PX = 12;

export type ClientPoint = {
  x: number;
  y: number;
};

export type MapPingPressIdentity =
  | { kind: "keyboard"; code: string }
  | { kind: "mouse"; button: number };

export type MapPingInteractionStart = {
  identity: MapPingPressIdentity;
  mapId: number;
  origin: ClientPoint;
  tile: MapTile;
};

export type MapPingSubmission = {
  mapId: number;
  tile: MapTile;
  type: MapPingType;
};

export type MapPingWheelSnapshot = {
  selectedType: MapPingType | null;
  visualCenter: ClientPoint;
};

type ViewportSize = {
  height: number;
  width: number;
};

type TimerHandle = number;

type ControllerDependencies = {
  clearTimer: (timer: TimerHandle) => void;
  getViewport: () => ViewportSize;
  setTimer: (callback: () => void, delayMs: number) => TimerHandle;
};

type InteractionState = {
  identity: MapPingPressIdentity;
  mapId: number;
  origin: ClientPoint;
  phase: "pending" | "wheel-open";
  selectedType: MapPingType | null;
  tile: MapTile;
  timer: TimerHandle | null;
  visualCenter: ClientPoint | null;
};

const defaultDependencies: ControllerDependencies = {
  clearTimer: (timer) => globalThis.clearTimeout(timer),
  getViewport: () => ({ height: window.innerHeight, width: window.innerWidth }),
  setTimer: (callback, delayMs) =>
    setMeasuredTimeout("map-pings.hold-delay", callback, delayMs),
};

export const createMapPingPressIdentity = (
  event: KeyboardEvent | MouseEvent,
): MapPingPressIdentity => {
  if (event instanceof KeyboardEvent) {
    return { kind: "keyboard", code: event.code };
  }

  return { kind: "mouse", button: event.button };
};

export const isSameMapPingPressIdentity = (
  first: MapPingPressIdentity,
  second: MapPingPressIdentity,
) => {
  if (first.kind !== second.kind) {
    return false;
  }

  if (first.kind === "keyboard" && second.kind === "keyboard") {
    return first.code === second.code;
  }

  return (
    first.kind === "mouse" &&
    second.kind === "mouse" &&
    first.button === second.button
  );
};

export const clampMapPingWheelCenter = (
  origin: ClientPoint,
  viewport: ViewportSize,
): ClientPoint => {
  const minimumCenter = MAP_PING_WHEEL_RADIUS_PX + MAP_PING_WHEEL_MARGIN_PX;
  const clampAxis = (coordinate: number, viewportSize: number) => {
    if (viewportSize < minimumCenter * 2) {
      return viewportSize / 2;
    }

    return Math.min(
      Math.max(coordinate, minimumCenter),
      viewportSize - minimumCenter,
    );
  };

  return {
    x: clampAxis(origin.x, viewport.width),
    y: clampAxis(origin.y, viewport.height),
  };
};

export const resolveMapPingTypeFromPointer = (
  origin: ClientPoint,
  pointer: ClientPoint,
): MapPingType | null => {
  const deltaX = pointer.x - origin.x;
  const deltaY = pointer.y - origin.y;
  if (Math.hypot(deltaX, deltaY) <= MAP_PING_WHEEL_DEAD_ZONE_PX) {
    return null;
  }

  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
  if (angle >= -135 && angle < -45) {
    return "attention";
  }
  if (angle >= -45 && angle < 45) {
    return "enemy";
  }
  if (angle >= 45 && angle < 135) {
    return "avoid";
  }

  return "regroup";
};

export class MapPingInteractionController {
  private readonly dependencies: ControllerDependencies;
  private readonly listeners = new Set<() => void>();
  private snapshot: MapPingWheelSnapshot | null = null;
  private state: InteractionState | null = null;

  constructor(dependencies: Partial<ControllerDependencies> = {}) {
    this.dependencies = { ...defaultDependencies, ...dependencies };
  }

  begin(input: MapPingInteractionStart): boolean {
    if (this.state) {
      return false;
    }

    const timer = this.dependencies.setTimer(
      () => this.openWheel(input.identity),
      MAP_PING_HOLD_DELAY_MS,
    );
    this.state = {
      ...input,
      phase: "pending",
      selectedType: null,
      timer,
      visualCenter: null,
    };
    return true;
  }

  updatePointer(position: ClientPoint): void {
    if (!this.state || this.state.phase !== "wheel-open") {
      return;
    }

    const visualCenter = this.state.visualCenter;
    if (!visualCenter) {
      return;
    }

    const selectedType = resolveMapPingTypeFromPointer(
      this.state.origin,
      position,
    );
    if (selectedType === this.state.selectedType) {
      return;
    }

    this.state = { ...this.state, selectedType };
    this.setSnapshot({
      selectedType,
      visualCenter,
    });
  }

  complete(identity: MapPingPressIdentity): MapPingSubmission | null {
    const state = this.state;
    if (!state || !isSameMapPingPressIdentity(state.identity, identity)) {
      return null;
    }

    this.reset();
    if (state.phase === "pending") {
      return { mapId: state.mapId, tile: state.tile, type: "attention" };
    }
    if (!state.selectedType) {
      return null;
    }

    return {
      mapId: state.mapId,
      tile: state.tile,
      type: state.selectedType,
    };
  }

  cancel(): void {
    this.reset();
  }

  isActive(): boolean {
    return this.state !== null;
  }

  readonly getSnapshot = (): MapPingWheelSnapshot | null => this.snapshot;

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private openWheel(identity: MapPingPressIdentity): void {
    if (
      !this.state ||
      this.state.phase !== "pending" ||
      !isSameMapPingPressIdentity(this.state.identity, identity)
    ) {
      return;
    }

    const visualCenter = clampMapPingWheelCenter(
      this.state.origin,
      this.dependencies.getViewport(),
    );
    this.state = {
      ...this.state,
      phase: "wheel-open",
      timer: null,
      visualCenter,
    };
    this.setSnapshot({ selectedType: null, visualCenter });
  }

  private reset(): void {
    if (!this.state) {
      return;
    }

    if (this.state.timer) {
      this.dependencies.clearTimer(this.state.timer);
    }
    this.state = null;
    this.setSnapshot(null);
  }

  private setSnapshot(snapshot: MapPingWheelSnapshot | null): void {
    if (this.snapshot === snapshot) {
      return;
    }

    this.snapshot = snapshot;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const mapPingInteractionController = new MapPingInteractionController();
