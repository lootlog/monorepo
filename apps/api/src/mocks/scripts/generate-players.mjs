import { generate } from 'random-words';
import { writeFileSync } from 'fs';

const professions = ['p', 'w', 'h', 'b', 't', 'm'];

const generatePlayers = () => {
  const players = Array.from({ length: 1000 }, (_, i) => {
    const nicknameWords = Math.floor(Math.random() * 3) + 1;
    const name = generate(nicknameWords).join(' ');

    return {
      originalId: i,
      name,
      prof: professions[Math.floor(Math.random() * professions.length)],
      icon: '/noob/hm.gif',
      hpp: Math.floor(Math.random() * 100),
      lvl: Math.floor(Math.random() * 300),
    };
  });

  writeFileSync(
    './src/mocks/data/players.json',
    JSON.stringify(players, null, 2),
  );
};

generatePlayers();
