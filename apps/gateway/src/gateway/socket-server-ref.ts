import type { GatewayNamespace } from "./types/socket-user.type.js";

export class SocketServerRef {
  private namespace: GatewayNamespace | null = null;

  set(namespace: GatewayNamespace) {
    this.namespace = namespace;
  }

  get() {
    if (this.namespace === null) {
      throw new Error("Gateway socket namespace is not initialized");
    }

    return this.namespace;
  }
}
