import { useEffect, useRef, useState } from "react";

type SharedStoredStateOptions<Value> = {
  /** Where this browser keeps the value between visits. */
  storageKey: string;
  /** The query parameters a shared link carries the value in, newest first. */
  params: ReadonlyArray<string>;
  encode: (value: Value) => string;
  decode: (text: string) => Value;
  /** The value before the browser has read one, and when it has none. */
  empty: Value;
};

/**
 * The value opened from a shared link, or else the one this browser last had.
 * A shared link replaces the stored value and leaves the address bar, so a
 * reload keeps any changes instead of reopening the link.
 */
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

/**
 * State a player keeps across visits and shares as a link. The server renders
 * `empty`; the browser reads the real value after hydration, so both render
 * the same markup first.
 */
export const useSharedStoredState = <Value>(
  options: SharedStoredStateOptions<Value>,
) => {
  const [value, setValue] = useState<Value | null>(null);
  const hasReadInitialValue = useRef(false);
  const { storageKey, encode, empty } = options;

  useEffect(() => {
    // Reading a shared link consumes it, so it is read once: a second run,
    // as Strict Mode makes, would find the link gone and open an empty value.
    if (hasReadInitialValue.current) return;

    hasReadInitialValue.current = true;
    setValue(readInitialValue(options));
  }, [options]);

  useEffect(() => {
    if (value === null) return;

    try {
      localStorage.setItem(storageKey, encode(value));
    } catch {
      // Storage can be blocked; the value then lasts until the page closes.
    }
  }, [value, storageKey, encode]);

  const update = (change: (current: Value) => Value) =>
    setValue((current) => change(current ?? empty));

  return [value ?? empty, update] as const;
};
