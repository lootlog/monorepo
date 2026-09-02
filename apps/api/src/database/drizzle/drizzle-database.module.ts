import { Global, Module } from "@nestjs/common";
import { DrizzleDatabaseRuntime } from "./runtime.js";

/** Transitional host module; removed when the last Nest route moves to Bun. */
@Global()
@Module({
  providers: [DrizzleDatabaseRuntime],
  exports: [DrizzleDatabaseRuntime],
})
export class DrizzleDatabaseModule {}
