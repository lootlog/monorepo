import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

declare global {
  var __TEST_CONTAINERS__: {
    postgres: StartedPostgreSqlContainer;
    redis: StartedTestContainer;
    rabbitmq: StartedTestContainer;
  };
}

export default async function globalSetup() {
  console.log('🚀 Starting test containers...');

  const postgres = await new PostgreSqlContainer('postgres:17')
    .withDatabase('test_lootlog')
    .withUsername('test_user')
    .withPassword('test_password')
    .start();

  const redis = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  const rabbitmq = await new GenericContainer('rabbitmq:4-alpine')
    .withExposedPorts(5672)
    .withWaitStrategy(Wait.forLogMessage('Server startup complete'))
    .withStartupTimeout(60000)
    .start();

  const postgresConnectionString = postgres.getConnectionUri();
  const rabbitmqUri = `amqp://guest:guest@${rabbitmq.getHost()}:${rabbitmq.getMappedPort(5672)}`;

  process.env.POSTGRESQL_CONNECTION_URI = postgresConnectionString;
  process.env.REDIS_HOST = redis.getHost();
  process.env.REDIS_PORT = String(redis.getMappedPort(6379));
  process.env.REDIS_PASSWORD = '';
  process.env.REDIS_USERNAME = '';
  process.env.RABBITMQ_URI = rabbitmqUri;
  process.env.AUTH_SERVICE_URL = 'http://localhost/api/auth';
  process.env.AUTH_INTERNAL_URL = 'http://localhost:4001';
  process.env.AUTH_JWKS_URI = 'http://localhost/api/auth/idp/jwks';
  process.env.INTERNAL_SERVICE_AUTH_SECRET = 'test-internal-service-secret';
  process.env.FORWARDED_AUTH_SIGNATURE_SECRET = 'test-forwarded-auth-secret';

  console.log('✅ Test containers started');
  console.log('📊 PostgreSQL:', postgresConnectionString);
  console.log('📊 Redis:', `${redis.getHost()}:${redis.getMappedPort(6379)}`);
  console.log('📊 RabbitMQ:', rabbitmqUri);

  const envVars: NodeJS.ProcessEnv = {} as NodeJS.ProcessEnv;
  for (const key in process.env) {
    const value = process.env[key];
    if (value !== undefined) {
      envVars[key] = String(value);
    }
  }
  envVars.POSTGRESQL_CONNECTION_URI = postgresConnectionString;

  console.log('🔄 Running Prisma migrations...');
  try {
    await execAsync('pnpm prisma migrate deploy', {
      cwd: process.cwd(),
      env: envVars,
    });
    console.log('✅ Prisma migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }

  global.__TEST_CONTAINERS__ = { postgres, redis, rabbitmq };
}
