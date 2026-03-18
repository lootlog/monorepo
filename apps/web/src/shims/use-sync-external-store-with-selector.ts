// ESM shim for use-sync-external-store/shim/with-selector
// Uses React 19's native useSyncExternalStore
import {
  useSyncExternalStore,
  useRef,
  useEffect,
  useMemo,
  useDebugValue,
} from "react";

function is(x: unknown, y: unknown): boolean {
  return (
    (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) ||
    (x !== x && y !== y)
  );
}

const objectIs: (x: unknown, y: unknown) => boolean =
  typeof Object.is === "function" ? Object.is : is;

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: undefined | null | (() => Snapshot),
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean,
): Selection {
  const instRef = useRef<{ hasValue: boolean; value: Selection | null } | null>(
    null,
  );

  if (instRef.current === null) {
    instRef.current = { hasValue: false, value: null };
  }

  const [getSelection, getServerSelection] = useMemo(() => {
    let hasMemo = false;
    let memoizedSnapshot: Snapshot;
    let memoizedSelection: Selection;

    const memoizedSelector = (nextSnapshot: Snapshot): Selection => {
      if (!hasMemo) {
        hasMemo = true;
        memoizedSnapshot = nextSnapshot;
        const nextSelection = selector(nextSnapshot);
        const currentInst = instRef.current;

        if (isEqual !== undefined && currentInst?.hasValue) {
          const currentSelection = currentInst.value as Selection;
          if (isEqual(currentSelection, nextSelection)) {
            memoizedSelection = currentSelection;
            return currentSelection;
          }
        }

        memoizedSelection = nextSelection;
        return nextSelection;
      }

      const currentSelection = memoizedSelection;

      if (objectIs(memoizedSnapshot, nextSnapshot)) {
        return currentSelection;
      }

      const nextSelection = selector(nextSnapshot);

      if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot;
        return currentSelection;
      }

      memoizedSnapshot = nextSnapshot;
      memoizedSelection = nextSelection;
      return nextSelection;
    };

    const maybeGetServerSnapshot =
      getServerSnapshot === undefined || getServerSnapshot === null
        ? null
        : getServerSnapshot;

    const getSnapshotWithSelector = (): Selection =>
      memoizedSelector(getSnapshot());

    const getServerSnapshotWithSelector =
      maybeGetServerSnapshot === null
        ? undefined
        : (): Selection => memoizedSelector(maybeGetServerSnapshot());

    return [getSnapshotWithSelector, getServerSnapshotWithSelector];
  }, [getSnapshot, getServerSnapshot, instRef, isEqual, selector]);

  const value = useSyncExternalStore(
    subscribe,
    getSelection,
    getServerSelection,
  );

  useEffect(() => {
    if (instRef.current) {
      instRef.current.hasValue = true;
      instRef.current.value = value;
    }
  }, [instRef, value]);

  useDebugValue(value);

  return value;
}
