import { Effect } from "effect";

type PromiseService<Service> = {
  [Key in keyof Service]: Service[Key] extends (
    ...arguments_: infer Arguments
  ) => Effect.Effect<infer Success, infer Failure, never>
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
