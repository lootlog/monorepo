import { Effect } from "effect";

type PromiseService<Service> = {
  [Key in keyof Service]: Service[Key] extends (
    ...arguments_: infer Arguments
  ) => Effect.Effect<infer Success, infer _Failure, never>
    ? (...arguments_: Arguments) => Promise<Success>
    : Service[Key];
};

export const runEffectService = <Service extends object>(
  service: Service,
): PromiseService<Service> =>
  new Proxy(service, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver) as unknown;
      if (typeof value !== "function") return value;
      return (...arguments_: unknown[]) => {
        const result: unknown = Reflect.apply(value, target, arguments_);
        return Effect.isEffect(result)
          ? Effect.runPromise(result as Effect.Effect<unknown, unknown, never>)
          : result;
      };
    },
  }) as PromiseService<Service>;

const effectifyDatabaseValue = (value: unknown): unknown => {
  if (Effect.isEffect(value)) return value;
  if (value instanceof Promise) {
    return Effect.tryPromise({ try: () => value, catch: (cause) => cause });
  }
  if (value !== null && typeof value === "object") {
    return new Proxy(value, {
      get(target, property, receiver) {
        const member = Reflect.get(target, property, receiver) as unknown;
        if (typeof member !== "function") {
          return effectifyDatabaseValue(member);
        }
        return (...arguments_: ReadonlyArray<unknown>) =>
          effectifyDatabaseValue(Reflect.apply(member, target, arguments_));
      },
    });
  }
  return Effect.succeed(value);
};

/** Adapts Promise-based test doubles to the Effect-native Drizzle contract. */
export const effectDatabaseBoundary = <Database extends object>(
  database: Database,
): Database => effectifyDatabaseValue(database) as Database;
