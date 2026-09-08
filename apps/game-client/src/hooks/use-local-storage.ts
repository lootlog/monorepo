import type { JsonValue } from "@lootlog/schema/http-scalars";
import type { ZodType } from "zod";
import {
  useEffect,
  useReducer,
  type Dispatch,
  type SetStateAction,
} from "react";

type UseLocalStorageReturn<T extends typeof JsonValue.Type> = [
  T | undefined,
  Dispatch<SetStateAction<T | undefined>>,
  () => void,
];

const readStoredValue = <T extends typeof JsonValue.Type>(
  key: string,
  initialValue: T | undefined,
  schema: ZodType<T>,
): T | undefined => {
  try {
    const item = window.localStorage.getItem(key);

    if (item === null) {
      return initialValue;
    }

    return schema.parse(JSON.parse(item));
  } catch {
    return initialValue;
  }
};

export function useLocalStorage<T extends typeof JsonValue.Type>(
  key: string,
  initialValue: T | undefined,
  schema: ZodType<T>,
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
  const reduceStorageState = (
    state: StorageState,
    action: StorageAction,
  ): StorageState => {
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
        ? action.value(state.value)
        : action.value;
    return { ...state, shouldPersist: true, value: nextValue };
  };
  const [storageState, dispatch] = useReducer(reduceStorageState, {
    key,
    shouldPersist: false,
    value: readStoredValue(key, initialValue, schema),
  });

  useEffect(() => {
    dispatch({
      key,
      type: "hydrate",
      value: readStoredValue(key, initialValue, schema),
    });
  }, [initialValue, key, schema]);

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
