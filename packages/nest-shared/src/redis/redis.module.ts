import {
  type DynamicModule,
  type InjectionToken,
  Module,
  type OptionalFactoryDependency,
} from "@nestjs/common";
import {
  RedisService,
  REDIS_MODULE_OPTIONS,
  type RedisModuleOptions,
} from "./redis.service";

@Module({})
export class RedisModule {
  static register(options: RedisModuleOptions): DynamicModule {
    return {
      global: true,
      module: RedisModule,
      providers: [
        {
          provide: REDIS_MODULE_OPTIONS,
          useValue: options,
        },
        RedisService,
      ],
      exports: [RedisService],
    };
  }

  static registerAsync(options: {
    inject?: (InjectionToken | OptionalFactoryDependency)[];
    useFactory: (...args: never[]) => RedisModuleOptions;
  }): DynamicModule {
    return {
      global: true,
      module: RedisModule,
      providers: [
        {
          provide: REDIS_MODULE_OPTIONS,
          inject: options.inject ?? [],
          useFactory: options.useFactory,
        },
        RedisService,
      ],
      exports: [RedisService],
    };
  }
}
