declare global {
  const jest: typeof import("vitest").vi;

  namespace jest {
    type Mock<T extends (...args: any[]) => any = (...args: any[]) => any> =
      import("vitest").Mock<T>;
    type Mocked<T> = import("vitest").Mocked<T>;
  }
}

export {};
