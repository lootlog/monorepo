import type { RealtimeHub } from "../src/realtime/realtime-hub.js";

const unexpectedFederationIO = () =>
  Promise.reject(new Error("Unexpected federation I/O"));

export const unusedFederationStore = {
  publish: unexpectedFederationIO,
  subscribe: unexpectedFederationIO,
  command: {
    set: unexpectedFederationIO,
    del: unexpectedFederationIO,
    sadd: unexpectedFederationIO,
    srem: unexpectedFederationIO,
    expire: unexpectedFederationIO,
    smembers: unexpectedFederationIO,
    mget: unexpectedFederationIO,
  },
} satisfies ConstructorParameters<typeof RealtimeHub>[1];
