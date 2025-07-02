import fs from 'fs';
import { PrismaClient } from 'generated/client';

const prisma = new PrismaClient();

const BATCH_SIZE = 5000;
const FILE = 'loots_dump.json';

async function main() {
  let allLootsCount = 0;
  let offset = 0;
  let isFirstBatch = true;

  // Utwórz plik i otwórz tablicę JSON
  fs.writeFileSync(FILE, '[\n');

  while (true) {
    const loots = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "loots" ORDER BY "id" ASC LIMIT ${BATCH_SIZE} OFFSET ${offset}`,
    )) as any[];

    if (loots.length === 0) break;

    // Dopisz batch do pliku
    for (let i = 0; i < loots.length; i++) {
      const loot = loots[i];
      const json = JSON.stringify(loot, null, 2);
      // Jeśli to nie pierwszy rekord, dodaj przecinek i enter
      if (!isFirstBatch || i > 0) {
        fs.appendFileSync(FILE, ',\n');
      }
      fs.appendFileSync(FILE, json);
    }

    allLootsCount += loots.length;
    offset += BATCH_SIZE;
    isFirstBatch = false;
    console.log(`Pobrano ${allLootsCount} rekordów...`);
  }

  // Zamknij tablicę JSON
  fs.appendFileSync(FILE, '\n]\n');
  console.log(`Gotowe! Zapisano ${allLootsCount} rekordów do pliku ${FILE}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
