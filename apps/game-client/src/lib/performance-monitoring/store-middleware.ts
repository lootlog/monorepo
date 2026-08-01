import type { StateCreator, StoreApi, StoreMutatorIdentifier } from "zustand";
import type {
  PerformanceDetails,
  PerformanceRecordInput,
} from "./performance-collector";
import { measurePerformance, recordPerformance } from "./performance-monitor";

export type StorePerformanceMeasurement = {
  measure: <Result>(
    name: string,
    category: string,
    data: PerformanceDetails | undefined,
    callback: () => Result,
  ) => Result;
  record: (input: PerformanceRecordInput) => void;
};

const activeMeasurement: StorePerformanceMeasurement = {
  measure: measurePerformance,
  record: recordPerformance,
};

type SetStateInput<State> =
  | State
  | Partial<State>
  | ((state: State) => State | Partial<State>);

export function performanceStoreMiddleware<
  State,
  OutputMutators extends [StoreMutatorIdentifier, unknown][] = [],
>(
  storeName: string,
  initializer: StateCreator<State, [], OutputMutators>,
  getCardinality?: (state: State) => number,
  measurement: StorePerformanceMeasurement = activeMeasurement,
): StateCreator<State, [], OutputMutators> {
  if (
    import.meta.env.VITE_GAME_CLIENT_PERFORMANCE_MONITORING !== "1" &&
    measurement === activeMeasurement
  ) {
    return initializer;
  }

  const measuredInitializer: StateCreator<State> = (set, get, api) => {
    const originalSetState = set as StoreApi<State>["setState"];
    const originalSubscribe = api.subscribe;
    let subscriberCount = 0;

    const measuredSetState = function (
      partial: SetStateInput<State>,
      replace?: boolean,
    ) {
      const previousState = get();
      const measuredPartial =
        typeof partial === "function"
          ? (state: State) =>
              measurement.measure(
                `store.${storeName}.updater`,
                "store-updater",
                { subscriberCount },
                () =>
                  (partial as (currentState: State) => State | Partial<State>)(
                    state,
                  ),
              )
          : partial;
      return measurement.measure(
        `store.${storeName}.set`,
        "store",
        { subscriberCount },
        () => {
          if (replace === true) {
            originalSetState(
              measuredPartial as State | ((state: State) => State),
              true,
            );
          } else {
            originalSetState(measuredPartial, false);
          }

          const nextState = get();
          let cardinality = 0;
          try {
            cardinality = getCardinality?.(nextState) ?? 0;
          } catch {
            cardinality = -1;
          }
          measurement.record({
            category: "store",
            data: {
              cardinality,
              published: previousState !== nextState,
              subscriberCount,
            },
            name: `store.${storeName}.publication`,
          });
        },
      );
    } as StoreApi<State>["setState"];

    api.setState = measuredSetState;
    api.subscribe = (listener) => {
      subscriberCount += 1;
      const measuredListener: typeof listener = (state, previousState) =>
        measurement.measure(
          `store.${storeName}.subscriber.${listener.name || "anonymous"}`,
          "store-subscriber",
          { subscriberCount },
          () => listener(state, previousState),
        );
      const unsubscribe = originalSubscribe(measuredListener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        subscriberCount -= 1;
        unsubscribe();
      };
    };

    return initializer(measuredSetState, get, api);
  };

  return measuredInitializer as StateCreator<State, [], OutputMutators>;
}
