export default async function globalTeardown() {
  console.log('🛑 Stopping test containers...');
  console.log('⏳ Waiting for all connections to close...');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const containers = global.__TEST_CONTAINERS__;

  if (containers) {
    await Promise.all([
      containers.postgres.stop(),
      containers.redis.stop(),
      containers.rabbitmq.stop(),
    ]);

    console.log('✅ Test containers stopped');
  }
}
