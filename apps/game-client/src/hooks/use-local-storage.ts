import {
  useCallback,
  useEffect,
  useState,
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
  const [storedValue, setStoredValue] = useState<T | undefined>(() =>
    readStoredValue(key, initialValue),
  );

  useEffect(() => {
    setStoredValue(readStoredValue(key, initialValue));
  }, [initialValue, key]);

  const setValue: Dispatch<SetStateAction<T | undefined>> = useCallback(
    (value) => {
      setStoredValue((currentValue) => {
        const nextValue =
          typeof value === "function"
            ? (value as (currentValue: T | undefined) => T | undefined)(
                currentValue,
              )
            : value;

        if (nextValue === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        }

        return nextValue;
      });
    },
    [key],
  );

  const remove = useCallback(() => {
    window.localStorage.removeItem(key);
    setStoredValue(undefined);
  }, [key]);

  return [storedValue, setValue, remove];
}
