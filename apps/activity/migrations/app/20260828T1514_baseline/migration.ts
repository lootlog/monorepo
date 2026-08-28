#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0f5340b26743b0f07f6f8f30835b1c789b964d3a72a52272cf1a88ab01ea7cd2/contract';
import endContract from '../../snapshots/0f5340b26743b0f07f6f8f30835b1c789b964d3a72a52272cf1a88ab01ea7cd2/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  createExtension,
  fn,
  lit,
  primaryKey,
  rawSql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      createExtension('timescaledb'),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ActivitySource',
        members: ['GAME', 'WEB_APP'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ActivityType',
        members: ['CONNECT_EVENT', 'DISCONNECT_EVENT'],
      }),
      this.createTable({
        schema: 'public',
        table: 'Activity',
        columns: [
          col('actorSnapshotId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('details', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('discordId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('guildId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idempotencyKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('source', '"ActivitySource"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ActivitySource' } },
          }),
          col('type', '"ActivityType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ActivityType' } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('world', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id', 'createdAt'], { name: 'Activity_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'ActivityActorSnapshot',
        columns: [
          col('accountId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('characterId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('clanId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('clanName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fingerprint', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('icon', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lvl', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('prof', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('source', '"ActivitySource"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ActivitySource' } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'ActivityActorSnapshot_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'MemberActivitySession',
        columns: [
          col('connectedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('discordId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('guildId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastSeenAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('sessionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('source', '"ActivitySource"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ActivitySource' } },
          }),
          col('userAgent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('world', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['guildId', 'discordId', 'source', 'sessionId'], {
            name: 'MemberActivitySession_pkey',
          }),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'MemberActivityStats',
        columns: [
          col('activeSessionCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('discordId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('guildId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastSeenAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('source', '"ActivitySource"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ActivitySource' } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('visitCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['guildId', 'discordId', 'source'], { name: 'MemberActivityStats_pkey' }),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Activity',
        index: 'Activity_createdAt_guildId_idx',
        columns: ['createdAt', 'guildId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Activity',
        index: 'Activity_createdAt_type_idx',
        columns: ['createdAt', 'type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Activity',
        index: 'Activity_createdAt_userId_idx',
        columns: ['createdAt', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Activity',
        index: 'Activity_guildId_createdAt_idx',
        columns: ['guildId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Activity',
        index: 'Activity_idempotencyKey_createdAt_key',
        columns: ['idempotencyKey', 'createdAt'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'ActivityActorSnapshot',
        index: 'ActivityActorSnapshot_fingerprint_key',
        columns: ['fingerprint'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'MemberActivitySession',
        index: 'MemberActivitySession_guildId_discordId_source_idx',
        columns: ['guildId', 'discordId', 'source'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MemberActivitySession',
        index: 'MemberActivitySession_guildId_source_idx',
        columns: ['guildId', 'source'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MemberActivitySession',
        index: 'MemberActivitySession_lastSeenAt_idx',
        columns: ['lastSeenAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MemberActivityStats',
        index: 'MemberActivityStats_guildId_source_idx',
        columns: ['guildId', 'source'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Activity',
        foreignKey: {
          name: 'Activity_actorSnapshotId_fkey',
          columns: ['actorSnapshotId'],
          references: { schema: 'public', table: 'ActivityActorSnapshot', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      rawSql({
        id: 'timescaledb.Activity.hypertable',
        label: 'Convert Activity to a TimescaleDB hypertable',
        operationClass: 'additive',
        target: {
          id: 'postgres',
          details: { schema: 'public', objectType: 'table', name: 'Activity' },
        },
        precheck: [],
        execute: [
          {
            description: 'convert Activity to a hypertable partitioned by createdAt',
            sql: `SELECT create_hypertable(
              '"public"."Activity"',
              'createdAt',
              chunk_time_interval => INTERVAL '1 day',
              migrate_data => TRUE,
              if_not_exists => TRUE
            )`,
          },
        ],
        postcheck: [
          {
            description: 'verify Activity is a hypertable',
            sql: `SELECT EXISTS (
              SELECT 1
              FROM timescaledb_information.hypertables
              WHERE hypertable_schema = 'public'
                AND hypertable_name = 'Activity'
            ) AS result`,
          },
        ],
      }),
      rawSql({
        id: 'timescaledb.Activity.retention',
        label: 'Configure seven-day Activity retention',
        operationClass: 'additive',
        target: {
          id: 'postgres',
          details: { schema: 'public', objectType: 'table', name: 'Activity' },
        },
        precheck: [],
        execute: [
          {
            description: 'add seven-day retention policy',
            sql: `SELECT add_retention_policy(
              '"public"."Activity"',
              INTERVAL '7 days',
              if_not_exists => TRUE
            )`,
          },
        ],
        postcheck: [
          {
            description: 'verify Activity retention policy exists',
            sql: `SELECT EXISTS (
              SELECT 1
              FROM timescaledb_information.jobs
              WHERE hypertable_schema = 'public'
                AND hypertable_name = 'Activity'
                AND proc_name = 'policy_retention'
            ) AS result`,
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
