import { writeFileSync } from 'fs';
import generateLootPayload from './generate-loot.mjs';

const token =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Inl5RzhWZVc1djJVbzlYeFN2dDFkUCJ9.eyJpc3MiOiJodHRwczovL2xvb3Rsb2ctbG9jYWwuZXUuYXV0aDAuY29tLyIsInN1YiI6Im9hdXRoMnxEaXNjb3JkfDM2MjkwNzEzNTgyNDEwMTM3NiIsImF1ZCI6WyJodHRwczovL2xvY2FsLmxvb3Rsb2cucGwiLCJodHRwczovL2xvb3Rsb2ctbG9jYWwuZXUuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTcyNzY5NDk1NSwiZXhwIjoxNzI3NzgxMzU1LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiYXpwIjoiekJ1ODhWcTZYR083QnRaR2xHTUdXYkZVV2RJdDhEdU8ifQ.hNobZrwI0i_ezHaswdRcAQDSIAby6ENvziP1S2D_0BJrAzKik9ppiNLeE0GCK4oQsi2FxiVVFF1WqcWbTuLDJRMC0WrduUyBqBivnB4PFpGFjlVAxVlPMKam0euYXO0UmD1RhiwrKXPZ3_fCCy5ZWyzXb4gBmSRrbz5gR5pL91xlpXigcZDFK4YHsWVwy4WAS033oKUCD9TnwUA7NsWrv3N603jExg9g_ZU_NE15KW051n1lWphdBUfmZxMPeeV07gJbA73rhoLpcadiDyKWCwStTk4HGoc0XOnoMBJ-0dXb1j5ZdmXP3sSfWd5IKOFk0JI7PKi6UNzQyANjM7j98g';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const seedThroughBackend = async (amount = 1) => {
  const loots = Array.from({ length: amount }, () => generateLootPayload());
  let counter = amount;

  let errors = [];

  for (const loot of loots) {
    console.log(counter);

    const response = await fetch(`http://localhost:4000/loots`, {
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
