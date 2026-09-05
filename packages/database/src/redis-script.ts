import * as Redis from "effect/unstable/persistence/Redis";

/** One cache per Redis adapter; key count is part of the Lua descriptor identity. */
export class RedisScriptCache {
  private readonly scripts = new Map<
    string,
    Redis.Script<{ params: ReadonlyArray<unknown>; result: unknown }>
  >();

  get<TResult>(script: string, numberOfKeys: number) {
    const key = `${numberOfKeys}:${script}`;
    let descriptor = this.scripts.get(key);
    if (descriptor === undefined) {
      descriptor = Redis.script(
        (...parameters: ReadonlyArray<unknown>) => parameters,
        { lua: script, numberOfKeys },
      );
      this.scripts.set(key, descriptor);
    }
    return descriptor.withReturnType<TResult>();
  }
}
