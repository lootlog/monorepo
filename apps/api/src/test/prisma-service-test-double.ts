import { mockFn } from "./mock-fn";

type PrismaTestDoubleInput = Record<string, any>;

function createRawPlan(
  strings: TemplateStringsArray,
  ...values: unknown[]
): {
  affectedCount(): any;
  build(): any;
  returnsRow(_codecs: Record<string, string>): any;
  strings: TemplateStringsArray;
  values: unknown[];
} {
  const plan = {
    strings,
    values,
    affectedCount: () => plan,
    returnsRow: (_codecs: Record<string, string>) => plan,
    build: () => plan,
  };
  return plan;
}

/**
 * Adapts concise delegate declarations in unit tests to Prisma 8's application
 * boundary: `orm.public`, callback transactions and raw plans.
 */
export function createPrismaServiceTestDouble<
  TestDouble extends PrismaTestDoubleInput,
>(
  testDouble: TestDouble,
): TestDouble & {
  orm: { public: Record<string, any> };
  raw: { sql: typeof createRawPlan };
  transaction: (...args: any[]) => any;
  query: (...args: any[]) => any;
  execute: (...args: any[]) => any;
} {
  if (testDouble.orm?.public && testDouble.raw?.sql && testDouble.transaction) {
    return testDouble as ReturnType<
      typeof createPrismaServiceTestDouble<TestDouble>
    >;
  }

  const publicModels: Record<string, any> = {};

  for (const [key, value] of Object.entries(testDouble)) {
    if (key.startsWith("$") || typeof value !== "object" || value === null) {
      continue;
    }

    publicModels[`${key[0]?.toUpperCase()}${key.slice(1)}`] = value;
  }

  const transactionMock = testDouble.transaction ?? mockFn();
  const query = testDouble.query ?? mockFn();
  const execute = testDouble.execute ?? mockFn();
  const runTransaction = (
    callback: (...args: any[]) => any,
    options?: unknown,
  ) => {
    const wrappedCallback = (transactionTestDouble: PrismaTestDoubleInput) =>
      callback(createPrismaServiceTestDouble(transactionTestDouble));
    const result = transactionMock(wrappedCallback, options);

    if (result === undefined) {
      return wrappedCallback(testDouble);
    }

    return result;
  };
  const transaction = mockFn(runTransaction);
  const setTransactionImplementation =
    transaction.mockImplementation.bind(transaction);
  transaction.mockImplementation = (implementation: (...args: any[]) => any) =>
    setTransactionImplementation((callback, options) =>
      implementation(
        (transactionTestDouble: PrismaTestDoubleInput) =>
          callback(createPrismaServiceTestDouble(transactionTestDouble)),
        options,
      ),
    );

  return Object.assign(testDouble, {
    orm: { public: publicModels },
    raw: { sql: createRawPlan },
    transaction,
    query,
    execute,
  });
}
