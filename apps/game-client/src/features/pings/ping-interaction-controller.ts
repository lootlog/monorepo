import type { MapTile } from "./map-ping-controller";
import type { PingType } from "./ping-presentation";

/** A press shorter than this sends the menu's quick ping. */
export const PING_HOLD_DELAY_MS = 120;

/** Inside this radius the centre option is selected, or nothing. */
export const PING_WHEEL_DEAD_ZONE_PX = 18;

/** Distance from the wheel centre to each ring tile. */
export const PING_WHEEL_RING_RADIUS_PX = 52;

/** Moving the pointer this far from the centre cancels the selection. */
export const PING_WHEEL_CANCEL_RADIUS_PX = 100;

/** Half the wheel's footprint, including the selected tile's label. */
const PING_WHEEL_EXTENT_PX = 84;

const PING_WHEEL_MARGIN_PX = 8;

export type ClientPoint = {
  x: number;
  y: number;
};

export type PingPressIdentity =
  | { kind: "keyboard"; code: string }
  | { kind: "mouse"; button: number };

export type PingTarget =
  | { kind: "map"; mapId: number; tile: MapTile }
  | { kind: "battle"; warriorId: number };

export type PingMenu = {
  /** Sent when the press is released inside the dead zone. */
  centre: PingType | null;
  /** Sent when the press ends before the wheel opens. */
  quick: PingType | null;
  /** Options around the centre, clockwise from the top. */
  ring: readonly PingType[];
  title: string | null;
};

export type PingInteractionStart = {
  identity: PingPressIdentity;
  menu: PingMenu;
  origin: ClientPoint;
  target: PingTarget;
};

export type PingSubmission = {
  target: PingTarget;
  type: PingType;
};

export type PingWheelSnapshot = {
  menu: PingMenu;
  pointer: ClientPoint;
  selectedType: PingType | null;
  visualCenter: ClientPoint;
};

type ViewportSize = {
  height: number;
  width: number;
};

type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

type ControllerDependencies = {
  clearTimer: (timer: TimerHandle) => void;
  getViewport: () => ViewportSize;
  setTimer: (callback: () => void, delayMs: number) => TimerHandle;
};

type InteractionState = PingInteractionStart & {
  phase: "pending" | "wheel-open";
  timer: TimerHandle | null;
};

const defaultDependencies: ControllerDependencies = {
  clearTimer: (timer) => globalThis.clearTimeout(timer),
  getViewport: () => ({ height: window.innerHeight, width: window.innerWidth }),
  setTimer: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
};

export const createPingPressIdentity = (
  event: KeyboardEvent | MouseEvent,
): PingPressIdentity => {
  if (event instanceof KeyboardEvent) {
    return { kind: "keyboard", code: event.code };
  }

  return { kind: "mouse", button: event.button };
};

export const isSamePingPressIdentity = (
  first: PingPressIdentity,
  second: PingPressIdentity,
) => {
  if (first.kind === "keyboard" && second.kind === "keyboard") {
    return first.code === second.code;
  }

  return (
    first.kind === "mouse" &&
    second.kind === "mouse" &&
    first.button === second.button
  );
};

export const clampPingWheelCenter = (
  origin: ClientPoint,
  viewport: ViewportSize,
): ClientPoint => {
  const minimumCenter = PING_WHEEL_EXTENT_PX + PING_WHEEL_MARGIN_PX;

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

/**
 * Resolves the option under the pointer, measured from the centre the player
 * sees, so a clamped wheel near a screen edge still selects what it shows.
 */
export const resolvePingSelection = (
  menu: PingMenu,
  center: ClientPoint,
  pointer: ClientPoint,
): PingType | null => {
  const deltaX = pointer.x - center.x;
  const deltaY = pointer.y - center.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance <= PING_WHEEL_DEAD_ZONE_PX) {
    return menu.centre;
  }

  if (distance > PING_WHEEL_CANCEL_RADIUS_PX || menu.ring.length === 0) {
    return null;
  }

  const step = 360 / menu.ring.length;
  const angleFromTop = (Math.atan2(deltaY, deltaX) * 180) / Math.PI + 90;
  const index = Math.floor((((angleFromTop + step / 2) % 360) + 360) / step);

  return menu.ring[index % menu.ring.length] ?? null;
};

/** Angle of a ring option in degrees, clockwise from the top. */
export const getPingRingAngle = (index: number, count: number) =>
  (360 / count) * index;

export class PingInteractionController {
  private readonly dependencies: ControllerDependencies;
  private readonly listeners = new Set<() => void>();
  private snapshot: PingWheelSnapshot | null = null;
  private state: InteractionState | null = null;

  constructor(dependencies: Partial<ControllerDependencies> = {}) {
    this.dependencies = { ...defaultDependencies, ...dependencies };
  }

  begin(input: PingInteractionStart): boolean {
    if (this.state) {
      return false;
    }

    const timer = this.dependencies.setTimer(
      () => this.openWheel(input.identity, input.origin),
      PING_HOLD_DELAY_MS,
    );

    this.state = { ...input, phase: "pending", timer };

    return true;
  }

  updatePointer(pointer: ClientPoint): void {
    const state = this.state;

    if (!state) {
      return;
    }

    if (state.phase === "pending") {
      // A flick opens the wheel at once instead of waiting for the hold delay.
      const travelled = Math.hypot(
        pointer.x - state.origin.x,
        pointer.y - state.origin.y,
      );

      if (travelled > PING_WHEEL_DEAD_ZONE_PX) {
        this.openWheel(state.identity, pointer);
      }

      return;
    }

    const visualCenter = this.snapshot?.visualCenter;

    if (!visualCenter) {
      return;
    }

    this.setSnapshot({
      menu: state.menu,
      pointer,
      selectedType: resolvePingSelection(state.menu, visualCenter, pointer),
      visualCenter,
    });
  }

  complete(identity: PingPressIdentity): PingSubmission | null {
    const state = this.state;

    if (!state || !isSamePingPressIdentity(state.identity, identity)) {
      return null;
    }

    const type =
      state.phase === "pending"
        ? state.menu.quick
        : (this.snapshot?.selectedType ?? null);

    this.reset();

    return type ? { target: state.target, type } : null;
  }

  cancel(): void {
    this.reset();
  }

  isActive(): boolean {
    return this.state !== null;
  }

  readonly getSnapshot = (): PingWheelSnapshot | null => this.snapshot;

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  };

  private openWheel(identity: PingPressIdentity, pointer: ClientPoint): void {
    const state = this.state;

    if (
      !state ||
      state.phase !== "pending" ||
      !isSamePingPressIdentity(state.identity, identity)
    ) {
      return;
    }

    if (state.timer) {
      this.dependencies.clearTimer(state.timer);
    }

    const visualCenter = clampPingWheelCenter(
      state.origin,
      this.dependencies.getViewport(),
    );

    this.state = { ...state, phase: "wheel-open", timer: null };
    this.setSnapshot({
      menu: state.menu,
      pointer,
      selectedType: resolvePingSelection(state.menu, visualCenter, pointer),
      visualCenter,
    });
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

  private setSnapshot(snapshot: PingWheelSnapshot | null): void {
    this.snapshot = snapshot;

    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const pingInteractionController = new PingInteractionController();
