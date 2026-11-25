import { parseBattleMoves } from "@lootlog/battle-processor/battle-log";
import { describe, expect, it } from "vitest";
import battle from "../i18n/translations/battle.json";
import { battleMessageText, buildBattleMessage } from "./battle-message";

const fighters = new Map([
  ["27675", { name: "Malanek", team: 1 }],
  ["41341", { name: "Dmitrij Kowanin", team: 2 }],
  ["21097", { name: "Nysiek", team: 2 }],
]);

const translations: Record<string, string> = battle;

const messageOf = (row: string) => {
  const [move] = parseBattleMoves([{ f: { m: [row] } }]);

  if (!move) throw new Error("row did not parse");

  const message = buildBattleMessage(move, {
    fighter: (id) => fighters.get(id),
    text: (key) => translations[key] ?? key,
  });

  return { kind: message.kind, text: battleMessageText(message) };
};

describe("buildBattleMessage", () => {
  it.each([
    {
      row: "41341=85.85;27675=97.35;+dmg=13008;-redacdmg_per=-30;+acdmg=47;-absorb=6543;-dmg=2181;+oth_dmg=1287,a,Dmitrij Kowanin(84.78%)",
      kind: "attack2",
      lines: [
        "Dmitrij Kowanin(85.85%) uderzył z siłą +13008",
        "+Niszczenie pancerza o 47",
        " -1287 obrażeń otrzymał(a) Dmitrij Kowanin(84.78%).",
        "-Aktywna redukcja niszczenia pancerza: -30% przez całą walkę",
        "-Absorpcja 6543 obrażeń fizycznych",
        "Malanek(97.35%) otrzymał -2181 obrażeń",
      ],
    },
    {
      row: "21097=62.21;21097=62.21;tspell=Kamienna skóra;skillId=34;resfire_per=30;resfrost_per=30;reslight_per=40;antidote=15;achpp_per=12",
      kind: "attack2",
      lines: [
        "Nysiek wykonuje Kamienna skóra.",
        "Odporność na ogień +30%",
        "Odporność na zimno +30%",
        "Odporność na błyskawice +40%",
        "Odporność na truciznę +15%",
        "Zwiększenie pancerza o 12%",
      ],
    },
    {
      row: "41341=41.00;0;legbon_lastheal=28091,Dmitrij Kowanin(41.00%);light=1752,40",
      kind: "neu",
      lines: [
        "Dmitrij Kowanin(41.00%): Ostatni ratunek, zregenerowano 28091 punktów życia.",
        "Dmitrij Kowanin(41.00%) otrzymał 1752 (osłabione o 40%) obrażeń od błyskawic.",
      ],
    },
    {
      row: "0;0;winner=Malanek",
      kind: "win",
      lines: ["Zwyciężył Malanek"],
    },
  ])("renders $row as the game does", ({ row, kind, lines }) => {
    expect(messageOf(row)).toEqual({ kind, text: lines.join("\n") });
  });
});
