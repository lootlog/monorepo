import { useEffect, useRef, useState } from "react";

type SharedStoredStateOptions<Value> = {
  storageKey: string;
  params: ReadonlyArray<string>;
  encode: (value: Value) => string;
  decode: (text: string) => Value;
  empty: Value;
};

const readInitialValue = <Value>({
  storageKey,
  params,
  decode,
  empty,
}: SharedStoredStateOptions<Value>): Value => {
  const url = new URL(window.location.href);
  const param = params.find((name) => url.searchParams.has(name));

  if (param !== undefined) {
    const shared = url.searchParams.get(param) ?? "";

    for (const name of params) url.searchParams.delete(name);

    window.history.replaceState(window.history.state, "", url);

    return decode(shared);
  }

  try {
    const stored = localStorage.getItem(storageKey);

    return stored === null ? empty : decode(stored);
  } catch {
    return empty;
  }
};

export const useSharedStoredState = <Value>(
  options: SharedStoredStateOptions<Value>,
) => {
  const [value, setValue] = useState<Value | null>(null);
  const hasReadInitialValue = useRef(false);
  const { storageKey, encode, empty } = options;

  useEffect(() => {
    if (hasReadInitialValue.current) return;

    hasReadInitialValue.current = true;
    setValue(readInitialValue(options));
  }, [options]);

  useEffect(() => {
    if (value === null) return;

    try {
      localStorage.setItem(storageKey, encode(value));
    } catch {}
  }, [value, storageKey, encode]);

  const update = (change: (current: Value) => Value) =>
    setValue((current) => change(current ?? empty));

  return [value ?? empty, update] as const;
};
