import { mock } from "bun:test";

type MockProcedure = (...args: never[]) => unknown;

export function mockFn<T extends MockProcedure = MockProcedure>(
  implementation?: T,
) {
  return mock(implementation);
}
