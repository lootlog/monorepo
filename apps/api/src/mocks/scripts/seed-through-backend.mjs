import { writeFileSync } from 'fs';
import generateLootPayload from './generate-loot.mjs';

const token =
  'eyJhbGciOiJFZERTQSIsImtpZCI6IjBxeFE1bG5GMHVCRXFHanYyTlJ0cWpwWTJ0NTQ1M3FXIn0.eyJpZCI6IjR4WExCdlBTYlgybkhmZ3dNemFBUUNkZjVvOFFDZGFyIiwiZW1haWwiOiJrYW1pbHdyb25rYTdAZ21haWwuY29tIiwiZGlzY29yZElkIjoiMzYyOTA3MTM1ODI0MTAxMzc2IiwiaWF0IjoxNzUxMjAwMTQzLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0L2FwaS9hdXRoIiwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdC9hcGkvYXV0aCIsImV4cCI6MTc1MTI4NjU0Mywic3ViIjoiNHhYTEJ2UFNiWDJuSGZnd016YUFRQ2RmNW84UUNkYXIifQ.RH_hJngpQhYxxBWg4QajzaA3u40gPacFAayxLZqTWxOfuzUdiLU1sRvrpOLz7iHXWJZu16wu-2qfHMJOiU-lCA';

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
