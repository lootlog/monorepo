# Database Patterns

Detailed database access patterns and best practices for the Lootlog codebase.

## Prisma Configuration

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("POSTGRESQL_CONNECTION_URI")
}
```

## Query Patterns

### Relations & Includes

```typescript
const timer = await this.prisma.timer.findUnique({
  where: { timerId: { guildId, world, npcId } },
  include: { member: true, guild: true },
});
```

### Upsert

```typescript
const member = await this.prisma.member.upsert({
  where: { memberId: { userId: discordId, guildId } },
  update: { name: 'Updated', active: true },
  create: { userId: discordId, guild: { connect: { id: guildId } }, name: 'New' },
});
```

### Transactions

```typescript
await this.prisma.$transaction(async (tx) => {
  await tx.lootlogConfigNpc.deleteMany({ where: { lootlogConfigId: guildId } });
  await tx.guild.update({ where: { id: guildId }, data: { active: false } });
});
```

### Raw SQL (Complex Queries)

```typescript
const loots = await this.prisma.$queryRaw<LootQueryResult[]>(Prisma.sql`
  SELECT DISTINCT ON (l."id") l.*
  FROM "Loot" l
  INNER JOIN "LootSubmission" s ON s."lootId" = l."id"
  WHERE s."guildId" = ${guild.id}
  ORDER BY l."id" DESC
  LIMIT ${limit};
`);
```

**Security**: Always use `Prisma.sql` template literals. Never use `Prisma.raw` with user input.

## Soft Delete Pattern

```typescript
// Always soft delete
await this.prisma.guild.update({
  where: { id },
  data: { active: false },
});

// Query active records only
await this.prisma.guild.findMany({
  where: { active: true },
});
```

## Cursor-Based Pagination

```typescript
async fetchLoots({ cursor, limit = 20 }) {
  return this.prisma.loot.findMany({
    where: cursor ? { id: { lt: cursor } } : {},
    orderBy: { id: 'desc' },
    take: limit,
  });
}
```

## Indexing Strategy

```prisma
model Timer {
  @@id(name: "timerId", [guildId, world, npcId])
  @@index([npcId, guildId])
  @@index([guildId, maxSpawnTime])
}

model Member {
  @@unique(name: "memberId", [userId, guildId])
  @@index([id, guildId])
}
```
