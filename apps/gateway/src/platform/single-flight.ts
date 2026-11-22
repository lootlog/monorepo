import { Deferred, Effect } from "effect";

export class SingleFlight<Key, Value, Error> {
  private readonly pending = new Map<Key, Deferred.Deferred<Value, Error>>();

  run(
    key: Key,
    producer: Effect.Effect<Value, Error>,
  ): Effect.Effect<Value, Error> {
    return Effect.uninterruptibleMask((restore) =>
      Effect.suspend(() => {
        const pending = this.pending.get(key);

        if (pending) return restore(Deferred.await(pending));

        const result = Deferred.makeUnsafe<Value, Error>();
        this.pending.set(key, result);

        const read = producer.pipe(
          Effect.ensuring(
            Effect.sync(() => {
              if (this.pending.get(key) === result) this.pending.delete(key);
            }),
          ),
        );

        return Deferred.complete(result, read).pipe(
          Effect.forkDetach,
          Effect.andThen(restore(Deferred.await(result))),
        );
      }),
    );
  }
}
