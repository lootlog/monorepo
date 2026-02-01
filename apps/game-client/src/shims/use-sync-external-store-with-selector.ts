// React 19 has native useSyncExternalStore, so we provide a selector-based wrapper
// This shim redirects use-sync-external-store/shim/with-selector imports to use the native API
import { useSyncExternalStore, useRef, useCallback } from "react";

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: (() => Snapshot) | undefined,
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean,
): Selection {
  const prevSelectionRef = useRef<Selection | undefined>(undefined);
  const prevSnapshotRef = useRef<Snapshot | undefined>(undefined);

  const getSelection = useCallback(() => {
    const nextSnapshot = getSnapshot();

    if (
      prevSnapshotRef.current !== undefined &&
      Object.is(prevSnapshotRef.current, nextSnapshot)
    ) {
      return prevSelectionRef.current as Selection;
    }

    const nextSelection = selector(nextSnapshot);

    if (
      prevSelectionRef.current !== undefined &&
      isEqual !== undefined &&
      isEqual(prevSelectionRef.current, nextSelection)
    ) {
      return prevSelectionRef.current;
    }

    prevSnapshotRef.current = nextSnapshot;
    prevSelectionRef.current = nextSelection;
    return nextSelection;
  }, [getSnapshot, selector, isEqual]);

  const getServerSelection =
    getServerSnapshot === undefined
      ? undefined
      : () => selector(getServerSnapshot());

  return useSyncExternalStore(subscribe, getSelection, getServerSelection);
}
