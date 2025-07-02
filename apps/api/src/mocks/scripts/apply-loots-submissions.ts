import { PrismaClient } from 'generated/client';
import fs from 'fs';

const prisma = new PrismaClient();

const BATCH_SIZE = 1000;
const FILE = 'loots_dump.json';

async function main() {
  const raw = fs.readFileSync(FILE, 'utf8');
  const loots = JSON.parse(raw);

  // 1. Mapuj: uniqueId → id z tabeli Loot (nowej)
  // Pobierz wszystkie looty (z nowej bazy, po uniqueId)
  const uniqueIds = Array.from(
    new Set(loots.map((l) => l.uniqueId)),
  ) as string[];
  const lootRecords = await prisma.loot.findMany({
    where: { uniqueId: { in: uniqueIds } },
    select: { id: true, uniqueId: true },
  });
  const lootIdByUniqueId = Object.fromEntries(
    lootRecords.map((l) => [l.uniqueId, l.id]),
  );

  let submissions = [];
  for (const l of loots) {
    // Nie próbuj seedować submission dla lootu, którego nie ma (np. skip gdy nie znalazł id)
    const lootId = lootIdByUniqueId[l.uniqueId];
    if (!lootId) continue;

    if (l.guildId && l.memberId) {
      submissions.push({
        lootId,
        guildId: l.guildId,
        memberId: l.memberId,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      });
    }
  }

  // Batchowo wrzucaj submissions
  let i = 0;
  while (i < submissions.length) {
    const batch = submissions.slice(i, i + BATCH_SIZE);

    await prisma.lootSubmission.createMany({
      data: batch,
      skipDuplicates: true,
    });

    i += BATCH_SIZE;
    console.log(`Wstawiono ${i} / ${submissions.length} submissions...`);
  }

  console.log('Seedowanie submissions zakończone!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
