import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import type { EmitterSpec } from "../particles";
import { breathe, type AuraKitId, type AuraPreset } from "./preset";

/** What the kit auras shed whatever their kit: dust off the outline and a glint or two. */
const KIT_EMITTERS: readonly EmitterSpec[] = [
  {
    kind: "mote",
    rate: 6,
    from: "edge",
    life: [1, 1.8],
    speed: [4, 10],
    spread: 6.28,
    outward: 0.6,
    drag: 0.3,
    size: [0.6, 1.2],
    colors: 3,
    front: 0.5,
  },
  {
    kind: "glint",
    rate: 1.2,
    from: "body",
    life: [0.5, 0.9],
    speed: [0, 2],
    size: [3, 5],
    colors: 2,
    front: 0.7,
  },
];

/**
 * An aura made as a kit: the kit draws everything that is its own, so the preset only
 * names it and gives its colours and words.
 */
function kitAura(
  id: CharacterAuraId & AuraKitId,
  look: Pick<AuraPreset, "description" | "particles" | "tones" | "tip"> &
    Partial<AuraPreset>,
): AuraPreset {
  const [light, mid, dark] = look.tones;

  return {
    id,
    kit: id,
    tier: "legendary",
    rim: light,
    haze: mid,
    near: 0.85,
    far: 0.5,
    inner: 0.06,
    pulse: breathe(3.6, 0.1),
    emitters: KIT_EMITTERS,
    fx: [],
    burst: "kit",
    nick: [light, mid, dark],
    ...look,
  };
}

/** Auras made for single players, one kit each; anyone granted auras may wear them. */
export const PERSONAL_AURAS = {
  skyborne: kitAura("skyborne", {
    description:
      "Mapa unosi się w chmurach: obłoki leżą pod stopami i płyną nad całą mapą, nad ekranem wędrują słońce i księżyc, a światło całej mapy przechodzi przez dobę trwającą 67 sekund. Co chwilę niebo się otwiera i na postać spada słup słońca.",
    particles: ["#ffffff", "#dfeeff", "#ffe08a"],
    tones: ["#ffffff", "#bfe0ff", "#4a7ac8"],
    tip: "clouds",
  }),
  joker: kitAura("joker", {
    description:
      "Mapa staje się stołem do gry: wokół postaci krążą karty, na mapie leżą i odwracają się ogromne, a nad ekranem obraca się wachlarz talii. Co chwilę pasy mapy tasują się jak karty i przez ekran przelatuje pięćdziesiąta trzecia: Joker.",
    particles: ["#f6f0e2", "#d62836", "#1c1a22"],
    tones: ["#f6f0e2", "#d62836", "#5a0c14"],
    tip: "prism-corners",
  }),
  nightowl: kitAura("nightowl", {
    description:
      "Na mapie zapada noc z jednym kręgiem księżycowego światła wokół postaci, a w ciemności otwierają się 22 pary oczu, które ją śledzą. Co chwilę nad mapą przelatuje sowa wielka jak ekran i sypią się pióra.",
    particles: ["#ffffff", "#d8e2ff", "#ffc83c"],
    tones: ["#eef2ff", "#aab8ff", "#2a2a6a"],
    tip: "constellation",
    emitters: [
      ...KIT_EMITTERS,
      {
        kind: "feather",
        rate: 0.8,
        from: "above",
        life: [3, 4.5],
        speed: [2, 6],
        dir: Math.PI / 2,
        spread: 0.8,
        size: [1, 1],
        colors: 2,
        front: 0.4,
        land: "settle",
        wind: 0.5,
      },
    ],
  }),
  sunder: kitAura("sunder", {
    description:
      "Przez cały ekran, przez postać, biegnie linia światła: mapa nad nią jest rozjaśniona złotem, pod nią leży w cieniu, a pod stopami obraca się yin-yang. Co chwilę trzy cięcia topora rozsuwają połowy mapy, w szczelinie widać gwiazdy, a trzecie zatrzaskuje świat.",
    particles: ["#ffffff", "#ffde8c", "#c88246"],
    tones: ["#fffbe6", "#ffde8c", "#6a4418"],
    tip: "sigils",
  }),
  fortyfour: kitAura("fortyfour", {
    description:
      "Przy stopach postaci siedzi kot, po całej mapie chodzą świecące ślady łap, czterdzieści cztery naraz, a w dolnych rogach ekranu siedzą koty i machają ogonami. Co chwilę ogromna łapa przeciąga pazurami przez mapę i przez ekran przebiegają czterdzieści cztery koty.",
    particles: ["#ffffff", "#ffe0a8", "#ffbe5a"],
    tones: ["#fff4dc", "#ffbe5a", "#7a4a12"],
    tip: "phoenix",
    fx: ["footprints"],
  }),
  thirteenth: kitAura("thirteenth", {
    description:
      "Mapa stoi w złotej godzinie, a postać jest wskazówką zegara słonecznego szerokiego na cały ekran: jej długi cień obraca się po mapie obok trzynastu kresek. Co chwilę dzwon bije trzynaście razy i przy ostatnim uderzeniu słońce gaśnie.",
    particles: ["#ffffff", "#ffe2a0", "#ffb046"],
    tones: ["#fff2d0", "#ffb046", "#8a4a10"],
    tip: "holy-corners",
  }),
  ninepins: kitAura("ninepins", {
    description:
      "Z góry ekranu nad całą mapą zwisają nici, wokół postaci płonie krąg dziewięciu świec ze znakiem na ziemi, a obok niej unosi się laleczka. Co chwilę nad mapą pojawia się laleczka wielka jak ekran, wbija się w nią szpilka i cała mapa podskakuje.",
    particles: ["#ffffff", "#c8a0ff", "#6ee678"],
    tones: ["#f0e6ff", "#9a5ae6", "#2a0a4a"],
    tip: "skull-corners",
    emitters: [
      ...KIT_EMITTERS,
      {
        kind: "wisp",
        rate: 5,
        from: "around",
        radius: [26, 38],
        life: [1.2, 1.8],
        speed: [14, 22],
        size: [2.5, 4],
        colors: 2,
        colorFrom: 1,
        front: 0.4,
      },
    ],
  }),
  threefaces: kitAura("threefaces", {
    description:
      "Nad mapą wisi wielki sierp księżyca, ekran stoi w trzech pasach o różnym świetle, a po bokach postaci stoją dwie jej sylwetki i co 23 tyknięcia zamieniają się miejscami. Co chwilę pasy rozjeżdżają się jak rozbite lustro, sierp spada przez ekran jak ostrze i trzy znów stają się jednym.",
    particles: ["#ffffff", "#e2e8ff", "#aa5aff"],
    tones: ["#ffffff", "#c8d2ff", "#3a3a9a"],
    tip: "constellation",
  }),
  twineyes: kitAura("twineyes", {
    description:
      "Nic się od tej aury nie rozchodzi: nad mapą wiszą dwa wielkie oczy, czerwone z trzema wirującymi znakami i fioletowe z kręgami, a po dłoni postaci skaczą iskry. Co chwilę oczy otwierają się szeroko, z góry ekranu spada piorun, a postać łapie go w uniesioną dłoń, trzyma i wchłania.",
    particles: ["#ffffff", "#96c8ff", "#a488e8"],
    tones: ["#ffffff", "#96c8ff", "#3a2a8a"],
    tip: "bolt-corners",
    emitters: [
      {
        kind: "spark",
        rate: 4,
        from: "edge",
        life: [0.15, 0.35],
        speed: [30, 70],
        spread: 6.28,
        outward: 0.7,
        size: [0.7, 1.1],
        colors: 2,
        front: 0.7,
      },
    ],
  }),
  tulipwind: kitAura("tulipwind", {
    description:
      "Wokół postaci nie ma żadnej poświaty, są tylko zdarzenia: u jej stóp rosną tulipany, na skraju ekranu na tle niskiego słońca obraca się wiatrak, a nad całą mapą wiatr niesie płatki. Co chwilę skrzydła wiatraka rozpędzają się, urywają i lecą przez ekran jak jedno wielkie ostrze, obraz na mgnienie zmienia się w negatyw, a na całej mapie wschodzą tulipany.",
    particles: ["#e8323c", "#ff8a1e", "#f6f0e2", "#ff7ab0", "#ffd646"],
    tones: ["#fff6e2", "#ff8a1e", "#8a2a10"],
    tip: "blossoms",
    // Nothing glows round the character: the aura is what happens about it.
    bare: true,
    inner: 0,
    emitters: [
      {
        kind: "leaf",
        rate: 2.4,
        from: "above",
        life: [2.4, 3.4],
        speed: [6, 12],
        dir: Math.PI / 2,
        spread: 1.4,
        size: [2.4, 3.4],
        colors: 5,
        front: 0.6,
        land: "settle",
        wind: 0.9,
      },
    ],
    wind: -22,
  }),
} satisfies Partial<Record<CharacterAuraId, AuraPreset>>;
