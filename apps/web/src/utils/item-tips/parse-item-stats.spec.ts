import { parseItemStats } from "utils/item-tips/parse-item-stats";
import { describe, expect, it } from "vitest";

describe("parseItemStats", () => {
  it("should parse item stats correctly", () => {
    const stats =
      "bag=7;btype=18;created=1387358753;opis=Normalnie takie domki znikają w oczach, [br]ale ten jest twardy jak skała z ciasta, [br]które przeleżało pięćdziesiąt lat w piwnicy. [br]W nim wszystkie twoje klucze będą bezpieczne.[br][br]Gwiazdka #YEAR,-1,M# r.;permbound;rarity=common";
    const result = parseItemStats(stats);

    expect(result).toEqual([
      { key: "bag", value: "7" },
      { key: "btype", value: "18" },
      { key: "created", value: "1387358753" },
      {
        key: "opis",
        value:
          "Normalnie takie domki znikają w oczach, [br]ale ten jest twardy jak skała z ciasta, [br]które przeleżało pięćdziesiąt lat w piwnicy. [br]W nim wszystkie twoje klucze będą bezpieczne.[br][br]Gwiazdka #YEAR,-1,M# r.",
      },
      { key: "permbound", value: true },
      { key: "rarity", value: "common" },
    ]);
  });

  it("should parse stats correctly with more stats", () => {
    const stats =
      "amount=5;cansplit=1;capacity=200;created=1397926296;crit=1;heal=1520;legbon=lastheal,300;opis=Złotą gwiazdę ma wyłącznie prawdziwy szeryf[br]Teksasu, który potrafi kopnąć...[br]nie tylko z pół obrotu.[br][br]Dzika Wielkanoc 2014 r.;permbound;rarity=legendary;sa=158;ttl=180";
    const result = parseItemStats(stats);

    expect(result).toEqual([
      { key: "amount", value: "5" },
      { key: "cansplit", value: "1" },
      { key: "capacity", value: "200" },
      { key: "created", value: "1397926296" },
      { key: "crit", value: "1" },
      { key: "heal", value: "1520" },
      { key: "legbon", value: "lastheal,300" },
      {
        key: "opis",
        value:
          "Złotą gwiazdę ma wyłącznie prawdziwy szeryf[br]Teksasu, który potrafi kopnąć...[br]nie tylko z pół obrotu.[br][br]Dzika Wielkanoc 2014 r.",
      },
      { key: "permbound", value: true },
      { key: "rarity", value: "legendary" },
      { key: "sa", value: "158" },
      { key: "ttl", value: "180" },
    ]);
  });
});
