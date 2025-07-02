import { PrismaClient } from 'generated/client';
import fs from 'fs';

const prisma = new PrismaClient();

const BATCH_SIZE = 1000;
const FILE = 'loots_dump.json';

async function main() {
  const raw = fs.readFileSync(FILE, 'utf8');
  const loots = JSON.parse(raw);

  let i = 0;
  while (i < loots.length) {
    const batch = loots.slice(i, i + BATCH_SIZE);
    // Przekształć batch na format nowego modelu (jeśli trzeba)
    const lootData = batch.map((l) => ({
      uniqueId: l.uniqueId,
      items: l.items,
      world: l.world,
      source: l.source,
      location: l.location,
      players: l.players,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      npcs: l.npcs,
      // POMIŃ guildId, memberId jeśli nie istnieje w nowym modelu
    }));

    // createMany pomija duplikaty po unique, jeśli dasz skipDuplicates
    await prisma.loot.createMany({
      data: lootData,
      skipDuplicates: true,
    });

    i += BATCH_SIZE;
    console.log(`Wstawiono ${i} / ${loots.length} rekordów...`);
  }

  console.log('Seed zakończony!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
