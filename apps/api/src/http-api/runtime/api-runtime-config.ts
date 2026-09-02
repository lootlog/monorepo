import { Context, Layer } from "effect";
import {
  apiConfiguration,
  type ApiConfiguration,
} from "#src/config/api.config";

export { apiConfiguration as apiRuntimeConfiguration } from "#src/config/api.config";

export class ApiRuntimeConfig extends Context.Service<
  ApiRuntimeConfig,
  ApiConfiguration
>()("@lootlog/api/http-api/ApiRuntimeConfig") {
  static readonly layer = Layer.effect(ApiRuntimeConfig, apiConfiguration);
}
