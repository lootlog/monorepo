import type { PerformanceDetails } from "./performance-collector";
import { measurePerformance } from "./performance-monitor";

export type CallbackMeasurement = {
  measure: <Result>(
    name: string,
    category: string,
    data: PerformanceDetails | undefined,
    callback: () => Result,
  ) => Result;
};

const activeMeasurement: CallbackMeasurement = {
  measure: measurePerformance,
};

export function createMeasuredCallback<
  This,
  Arguments extends unknown[],
  Result,
>(
  measurement: CallbackMeasurement,
  name: string,
  callback: (this: This, ...args: Arguments) => Result,
  data?: PerformanceDetails,
): (this: This, ...args: Arguments) => Result {
  return function measuredCallback(this: This, ...args: Arguments): Result {
    return measurement.measure(name, "callback", data, () =>
      Reflect.apply(callback, this, args),
    );
  };
}

export function measureLootlogCallback<
  This,
  Arguments extends unknown[],
  Result,
>(
  name: string,
  callback: (this: This, ...args: Arguments) => Result,
  data?: PerformanceDetails,
): (this: This, ...args: Arguments) => Result {
  if (import.meta.env.VITE_GAME_CLIENT_PERFORMANCE_MONITORING !== "1") {
    return callback;
  }
  return createMeasuredCallback(activeMeasurement, name, callback, data);
}

export function addMeasuredEventListener<EventType extends Event = Event>(
  target: EventTarget,
  type: string,
  listener:
    | ((this: EventTarget, event: EventType) => unknown)
    | EventListenerObject,
  name: string,
  options?: boolean | AddEventListenerOptions,
  measurement: CallbackMeasurement = activeMeasurement,
): () => void {
  const browserListener = listener as EventListenerOrEventListenerObject;
  if (
    measurement === activeMeasurement &&
    import.meta.env.VITE_GAME_CLIENT_PERFORMANCE_MONITORING !== "1"
  ) {
    target.addEventListener(type, browserListener, options);
    return () => target.removeEventListener(type, browserListener, options);
  }

  const data = { eventType: type };
  let measuredListener: EventListener;
  if (typeof listener === "function") {
    measuredListener = function (this: EventTarget, event: Event) {
      return measurement.measure(name, "listener", data, () =>
        Reflect.apply(listener, this, [event as EventType]),
      );
    };
  } else {
    measuredListener = (event) =>
      measurement.measure(name, "listener", data, () =>
        listener.handleEvent(event),
      );
  }

  target.addEventListener(type, measuredListener, options);
  return () => target.removeEventListener(type, measuredListener, options);
}

export function requestMeasuredAnimationFrame(
  name: string,
  callback: FrameRequestCallback,
): number {
  return requestAnimationFrame(
    measureLootlogCallback(name, callback, { scheduler: "animation-frame" }),
  );
}

export function setMeasuredTimeout(
  name: string,
  callback: () => void,
  delayMs: number,
): number {
  return window.setTimeout(
    measureLootlogCallback(name, callback, {
      delayMs,
      scheduler: "timeout",
    }),
    delayMs,
  );
}

export function setMeasuredInterval(
  name: string,
  callback: () => void,
  delayMs: number,
): number {
  return window.setInterval(
    measureLootlogCallback(name, callback, {
      delayMs,
      scheduler: "interval",
    }),
    delayMs,
  );
}

export function queueMeasuredMicrotask(
  name: string,
  callback: () => void,
): void {
  queueMicrotask(
    measureLootlogCallback(name, callback, { scheduler: "microtask" }),
  );
}

export function createMeasuredMutationObserver(
  name: string,
  callback: MutationCallback,
): MutationObserver {
  return new MutationObserver(
    measureLootlogCallback(name, callback, { observer: "mutation" }),
  );
}

export function createMeasuredResizeObserver(
  name: string,
  callback: ResizeObserverCallback,
): ResizeObserver {
  return new ResizeObserver(
    measureLootlogCallback(name, callback, { observer: "resize" }),
  );
}
