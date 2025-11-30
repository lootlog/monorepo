# @lootlog/nest-shared

Shared NestJS modules, services, and utilities for backend microservices.

## Features

- **No Build Required**: Direct TypeScript imports - works out of the box
- **Full NestJS Support**: All decorators and module system work seamlessly
- **Plug & Play**: Just import modules and start using them

## Usage

### 1. Add to your NestJS app

```bash
pnpm add @lootlog/nest-shared@workspace:*
```

### 2. Import modules in your app

```typescript
import { SomeModule } from "@lootlog/nest-shared";

@Module({
  imports: [SomeModule],
})
export class AppModule {}
```

### 3. That's it!

No build step needed - TypeScript compiles everything together with your app.

## Structure

```
src/
  index.ts              # Main exports
  module-name/          # Feature modules
    module-name.module.ts
    module-name.service.ts
    index.ts
```

## Adding New Shared Code

1. Create a new directory in `src/` for your module
2. Add your module, service, and other files
3. Export from the module's `index.ts`
4. Re-export from the main `src/index.ts`

Example:

```typescript
// src/logger/logger.module.ts
import { Module } from "@nestjs/common";
import { LoggerService } from "./logger.service";

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}

// src/logger/index.ts
export * from "./logger.module";
export * from "./logger.service";

// src/index.ts
export * from "./logger";
```
