import { isRecord } from "@lootlog/schema/records";

// Shape of public-api.margonem.pl/account/charlist entries (TCharacterData in the
// game's CharacterList.ts). Nicks, ids and levels are invented; icons, worlds and
// field layout follow a real response.
type MargonemCharlistEntry = {
  id: number;
  nick: string;
  world: string;
  lvl: number;
  prof: string;
  gender: "m" | "f";
  icon: string;
  last: number;
  clan: number;
  clan_rank: number;
};

export const SANDBOX_ACCOUNT_ID = 900000;

export const SANDBOX_CLAN = { id: 4242, name: "Sandbox Clan", rank: 1 };

export const SANDBOX_CHARACTERS: readonly MargonemCharlistEntry[] = [
  {
    id: 700000,
    nick: "Kapitan Rzepa",
    world: "pandora",
    lvl: 247,
    prof: "w",
    gender: "m",
    icon: "/eve/kup23-kaplani-m.gif",
    last: 1786388784,
    clan: SANDBOX_CLAN.id,
    clan_rank: SANDBOX_CLAN.rank,
  },
  {
    id: 700001,
    nick: "Mglisty Borsuk",
    world: "pandora",
    lvl: 183,
    prof: "m",
    gender: "m",
    icon: "/mage/50/m_mag16.gif",
    last: 1786361231,
    clan: SANDBOX_CLAN.id,
    clan_rank: 0,
  },
  {
    id: 700002,
    nick: "Cicha Jarzebina",
    world: "pandora",
    lvl: 96,
    prof: "t",
    gender: "m",
    icon: "/kuf/prof_xxiv_pal_m.gif",
    last: 1786315089,
    clan: 0,
    clan_rank: 0,
  },
  {
    id: 700003,
    nick: "Zelazny Kaczor",
    world: "pandora",
    lvl: 58,
    prof: "p",
    gender: "m",
    icon: "/pal/40/m_pal18.gif",
    last: 1786135483,
    clan: 0,
    clan_rank: 0,
  },
  {
    id: 700004,
    nick: "Opat Kminek",
    world: "pandora",
    lvl: 31,
    prof: "b",
    gender: "m",
    icon: "/bd/50/m_bd22.gif",
    last: 1754471422,
    clan: 0,
    clan_rank: 0,
  },
  {
    id: 700005,
    nick: "Wedrowny Pstrag",
    world: "gordion",
    lvl: 276,
    prof: "m",
    gender: "m",
    icon: "/kuf/kuf_v-out-f3.gif",
    last: 1786361231,
    clan: 692,
    clan_rank: 0,
  },
  {
    id: 700006,
    nick: "Bursztynowy Sum",
    world: "gordion",
    lvl: 142,
    prof: "w",
    gender: "m",
    icon: "/eve/kup23-kaplani-m.gif",
    last: 1786315089,
    clan: 58,
    clan_rank: 0,
  },
  {
    id: 700007,
    nick: "Rycerz Pietruszka",
    world: "gordion",
    lvl: 77,
    prof: "t",
    gender: "m",
    icon: "/kuf/prof_xxiv_pal_m.gif",
    last: 1786135515,
    clan: 0,
    clan_rank: 0,
  },
  {
    id: 700008,
    nick: "Gromki Chomik",
    world: "gordion",
    lvl: 49,
    prof: "b",
    gender: "m",
    icon: "/bd/50/m_bd22.gif",
    last: 1786135499,
    clan: 0,
    clan_rank: 0,
  },
  {
    id: 700009,
    nick: "Tropiciel Szyszek",
    world: "gordion",
    lvl: 22,
    prof: "t",
    gender: "m",
    icon: "/noob/tm.gif",
    last: 1786135460,
    clan: 0,
    clan_rank: 0,
  },
  {
    id: 700010,
    nick: "Lodowy Kalafior",
    world: "experimental",
    lvl: 300,
    prof: "t",
    gender: "m",
    icon: "/noob/tm.gif",
    last: 1786388741,
    clan: 15431,
    clan_rank: 100,
  },
  {
    id: 700011,
    nick: "Senny Dzik",
    world: "experimental",
    lvl: 213,
    prof: "h",
    gender: "m",
    icon: "/noob/hm.gif",
    last: 1786219441,
    clan: 0,
    clan_rank: 0,
  },
  {
    id: 700012,
    nick: "Mistrz Rosolu",
    world: "experimental",
    lvl: 164,
    prof: "p",
    gender: "m",
    icon: "/noob/pm.gif",
    last: 1781874331,
    clan: 0,
    clan_rank: 0,
  },
  {
    id: 700013,
    nick: "Pogodny Jez",
    world: "experimental",
    lvl: 238,
    prof: "m",
    gender: "m",
    icon: "/noob/mm.gif",
    last: 1786213265,
    clan: 15191,
    clan_rank: 0,
  },
  {
    id: 700014,
    nick: "Srebrny Labedz",
    world: "aether",
    lvl: 121,
    prof: "m",
    gender: "m",
    icon: "/kuf/leg_labedz_4_m.gif",
    last: 1761918870,
    clan: 0,
    clan_rank: 0,
  },
  {
    id: 700015,
    nick: "Milczacy Kmin",
    world: "aether",
    lvl: 64,
    prof: "w",
    gender: "m",
    icon: "/kuf/her_milcz_mag_m.gif",
    last: 1784406586,
    clan: 0,
    clan_rank: 0,
  },
];

const MARGONEM_STORAGE_KEY = "Margonem";

// CharacterList.onSuccess stores the response with Storage.set(`charlist/${accountId}`),
// which Lootlog reads before it calls the public API.
export function seedMargonemCharacterList(): void {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(MARGONEM_STORAGE_KEY) ?? "{}",
    );

    const storage = isRecord(stored) ? stored : {};
    const charlist = isRecord(storage.charlist) ? storage.charlist : {};

    localStorage.setItem(
      MARGONEM_STORAGE_KEY,
      JSON.stringify({
        ...storage,
        charlist: { ...charlist, [SANDBOX_ACCOUNT_ID]: SANDBOX_CHARACTERS },
      }),
    );
  } catch {
    // Storage can be unavailable; Lootlog then falls back to the public API.
  }
}
