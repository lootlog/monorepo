# @lootlog/socket-parser

MessagePack-based Socket.IO parser used by Lootlog clients.

## Overview

- Wraps `@msgpack/msgpack` in a Socket.IO-compatible parser shape.
- Preserves `undefined` values through a custom MessagePack extension codec.
- Exposes low-level `encode` and `decode` helpers alongside the parser object.

## Exports

- `msgpackParser`
- `encode`
- `decode`

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/socket-parser build
```

## Notes

- The implementation lives entirely in `src/index.ts`.
- The parser is intended for shared client and server protocol compatibility within the monorepo.
