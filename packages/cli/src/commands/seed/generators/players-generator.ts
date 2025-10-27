import { generate } from "random-words";
import crypto from "node:crypto";
import { SCRAPER_CONFIG } from "../config.js";

export interface GeneratedPlayer {
  originalId: number;
  characterId: string;
  name: string;
  prof: string;
  icon: string;
  hpp: number;
  lvl: number;
}

export function generatePlayers(count: number): GeneratedPlayer[] {
  const { professions } = SCRAPER_CONFIG;
  const players: GeneratedPlayer[] = [];

  for (let i = 0; i < count; i++) {
    const nicknameWords = crypto.randomInt(1, 4);
    const generatedWords = generate({ exactly: nicknameWords });
    const name = Array.isArray(generatedWords)
      ? generatedWords.join(" ")
      : generatedWords;

    players.push({
      originalId: i,
      characterId: String(i),
      name,
      prof: professions[crypto.randomInt(0, professions.length)] ?? "w",
      icon: "/noob/hm.gif",
      hpp: crypto.randomInt(0, 101),
      lvl: crypto.randomInt(1, 301),
    });
  }

  return players;
}
