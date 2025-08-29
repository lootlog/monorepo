import { writeFileSync } from 'fs';
import generateLootPayload from './generate-loot.mjs';

const token = 'your_token_here';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const seedThroughBackend = async (amount = 1) => {
  const loots = Array.from({ length: amount }, () => generateLootPayload());
  let counter = amount;

  let errors = [];

  for (const loot of loots) {
    console.log(counter);

    const response = await fetch(`http://localhost/loots`, {
      body: JSON.stringify(loot),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      errors.push(loot);
      console.log('Error:', JSON.stringify(loot, null, 2));
    }

    counter--;

    await sleep(1);
  }

  writeFileSync('./src/mocks/data/loots.json', JSON.stringify(loots, null, 2));
  writeFileSync(
    './src/mocks/data/errors.json',
    JSON.stringify(errors, null, 2),
  );
};

seedThroughBackend(10000);
