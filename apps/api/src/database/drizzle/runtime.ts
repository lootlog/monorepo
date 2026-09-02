import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { ManagedRuntime, type Effect } from "effect";
import { ApiDatabaseLive, type ApiDatabase } from "./database.js";

/**
 * Temporary boundary for controllers that still run under Nest during the
 * route-by-route rewrite. The owned Effect runtime remains scoped and is
 * disposed by the host shutdown hook.
 */
@Injectable()
export class DrizzleDatabaseRuntime implements OnApplicationShutdown {
  private readonly runtime = ManagedRuntime.make(ApiDatabaseLive);

  runPromise<A, E>(effect: Effect.Effect<A, E, ApiDatabase>): Promise<A> {
    return this.runtime.runPromise(effect);
  }

  async onApplicationShutdown() {
    await this.runtime.dispose();
  }
}
