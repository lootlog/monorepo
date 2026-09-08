import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { z } from "zod";
import { useLocalStorage } from "./use-local-storage";

const stringSchema = z.string();
const numbersSchema = z.array(z.number());
const emptyNumbers: number[] = [];

afterEach(() => localStorage.clear());

it("falls back on malformed persisted data without overwriting it during hydration", () => {
  localStorage.setItem("setting", JSON.stringify({ wrong: "shape" }));
  const { result, unmount } = renderHook(() =>
    useLocalStorage("setting", "default", stringSchema),
  );
  expect(result.current[0]).toBe("default");
  expect(localStorage.getItem("setting")).toBe('{"wrong":"shape"}');
  unmount();
});

it("persists functional updates and removes the stored value", () => {
  localStorage.setItem("numbers", "[1]");
  const { result, unmount } = renderHook(() =>
    useLocalStorage("numbers", emptyNumbers, numbersSchema),
  );
  act(() => result.current[1]((previous) => [...(previous ?? []), 2]));
  expect(result.current[0]).toEqual([1, 2]);
  expect(localStorage.getItem("numbers")).toBe("[1,2]");
  act(() => result.current[2]());
  expect(result.current[0]).toBeUndefined();
  expect(localStorage.getItem("numbers")).toBeNull();
  unmount();
});

it("hydrates a new character's key without persisting the previous character's value", () => {
  localStorage.setItem("first", '"one"');
  localStorage.setItem("second", '"two"');
  const { result, rerender, unmount } = renderHook(
    ({ key }) => useLocalStorage(key, "default", stringSchema),
    { initialProps: { key: "first" } },
  );
  expect(result.current[0]).toBe("one");
  rerender({ key: "second" });
  expect(result.current[0]).toBe("two");
  expect(localStorage.getItem("first")).toBe('"one"');
  expect(localStorage.getItem("second")).toBe('"two"');
  unmount();
});
