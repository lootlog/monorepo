import {
  useEffect,
  useReducer,
  type Dispatch,
  type SetStateAction,
} from "react";

type UseLocalStorageReturn<T> = [
  T | undefined,
  Dispatch<SetStateAction<T | undefined>>,
  () => void,
];

type UseLocalStorageReturnWithInitialValue<T> = [
  T,
  Dispatch<SetStateAction<T>>,
  () => void,
];

const readStoredValue = <T>(key: string, initialValue?: T): T | undefined => {
  try {
    const item = window.localStorage.getItem(key);

    if (item === null) {
      return initialValue;
    }

    return JSON.parse(item) as T;
  } catch {
    return initialValue;
  }
};

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): UseLocalStorageReturnWithInitialValue<T>;
export function useLocalStorage<T>(
  key: string,
  initialValue?: T,
): UseLocalStorageReturn<T>;
export function useLocalStorage<T>(
  key: string,
  initialValue?: T,
): UseLocalStorageReturn<T> {
  type StorageState = {
    key: string;
    shouldPersist: boolean;
    value: T | undefined;
  };
  type StorageAction =
    | { key: string; type: "hydrate"; value: T | undefined }
    | { type: "remove" }
    | { type: "set"; value: SetStateAction<T | undefined> };
  const [storageState, dispatch] = useReducer(
    (state: StorageState, action: StorageAction): StorageState => {
      if (action.type === "hydrate") {
        return {
          key: action.key,
          shouldPersist: false,
          value: action.value,
        };
      }
      if (action.type === "remove") {
        return { ...state, shouldPersist: true, value: undefined };
      }

      const nextValue =
        typeof action.value === "function"
          ? (action.value as (currentValue: T | undefined) => T | undefined)(
              state.value,
            )
          : action.value;
      return { ...state, shouldPersist: true, value: nextValue };
    },
    {
      key,
      shouldPersist: false,
      value: readStoredValue(key, initialValue),
    },
  );

  useEffect(() => {
    dispatch({
      key,
      type: "hydrate",
      value: readStoredValue(key, initialValue),
    });
  }, [initialValue, key]);

  useEffect(() => {
    if (!storageState.shouldPersist || storageState.key !== key) return;

    if (storageState.value === undefined) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(storageState.value));
  }, [key, storageState]);

  const setValue: Dispatch<SetStateAction<T | undefined>> = (value) => {
    dispatch({ type: "set", value });
  };
  const remove = () => dispatch({ type: "remove" });

  return [storageState.value, setValue, remove];
}
