import type { RabbitDelivery } from "@lootlog/messaging";

export const createRabbitDelivery = (
  routingKey: string,
  content: Buffer,
  messageId?: string,
  redelivered = false,
): RabbitDelivery => {
  const properties: RabbitDelivery["properties"] = {
    messageId,
    contentType: "application/json",
    contentEncoding: undefined,
    headers: {},
    deliveryMode: 2,
    priority: undefined,
    correlationId: undefined,
    replyTo: undefined,
    expiration: undefined,
    timestamp: undefined,
    type: undefined,
    userId: undefined,
    appId: undefined,
    clusterId: undefined,
  };
  const fields = {
    consumerTag: "gateway-test",
    deliveryTag: 1,
    exchange: "default",
    routingKey,
    redelivered,
  };
  return {
    content,
    properties,
    ...fields,
    raw: { content, properties, fields },
  };
};
