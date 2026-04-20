import type { Options } from "amqp-connection-manager";

export interface AmqpPublisher {
  publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    options?: Options.Publish,
  ): Promise<void>;
}

export class AmqpPublisherRef implements AmqpPublisher {
  private publisher: AmqpPublisher | null = null;

  set(publisher: AmqpPublisher) {
    this.publisher = publisher;
  }

  async publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    options?: Options.Publish,
  ) {
    if (this.publisher === null) {
      throw new Error("AMQP publisher is not initialized");
    }

    await this.publisher.publish(exchange, routingKey, payload, options);
  }
}
