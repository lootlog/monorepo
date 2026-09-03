export * from "bun:test";

import { setSystemTime, vi as bunVi } from "bun:test";

const originalGlobals = new Map<PropertyKey, PropertyDescriptor | undefined>();

export const vi = {
  ...bunVi,
  setSystemTime,
  mocked: <T>(value: T): T => value,
  stubGlobal: (name: PropertyKey, value: unknown): void => {
    if (!originalGlobals.has(name)) {
      originalGlobals.set(
        name,
        Object.getOwnPropertyDescriptor(globalThis, name),
      );
    }
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  },
  unstubAllGlobals: (): void => {
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor === undefined) Reflect.deleteProperty(globalThis, name);
      else Object.defineProperty(globalThis, name, descriptor);
    }
    originalGlobals.clear();
  },
  unstubAllEnvs: (): void => undefined,
};
