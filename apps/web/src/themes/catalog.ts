export const THEME_IDS = [
  "default",
  "cyberpunk",
  "pastel",
  "fantasy",
  "shonen",
  "onepiece",
  "anime",
  "waguri",
  "goth",
  "halloween",
  "realmadrid",
  "realmadrid-3rd",
  "barcelona",
  "rukia",
  "rias",
  "cat-pink",
  "cat-purple",
  "cat-blue",
  "cat-random",
] as const;

export const THEME_CLASS_IDS = [
  "default",
  "cyberpunk",
  "pastel",
  "fantasy",
  "shonen",
  "onepiece",
  "anime",
  "waguri",
  "goth",
  "halloween",
  "realmadrid",
  "realmadrid-3rd",
  "barcelona",
  "rukia",
  "rias",
  "cat-pink",
  "cat-purple",
  "cat-blue",
] as const;

export const CAT_THEME_VARIANTS = [
  "cat-pink",
  "cat-purple",
  "cat-blue",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ResolvedThemeId = (typeof THEME_CLASS_IDS)[number];

export type CatThemeVariant = (typeof CAT_THEME_VARIANTS)[number];

export type ThemeFamily = "standard" | "rukia" | "rias" | "cat";

export interface ThemePreview {
  name: ThemeId;
  family: ThemeFamily;
  colors: string[];
  backgroundImage: string;
}

export const DEFAULT_THEME_ID: ThemeId = "default";

export const DEFAULT_CAT_THEME_VARIANT: CatThemeVariant = "cat-pink";

export const THEME_STORAGE_KEY = "lootlog-theme";

export const THEME_CATALOG: ThemePreview[] = [
  {
    name: "default",
    family: "standard",
    colors: ["#C8F135", "#273321", "#07111F"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' viewBox='0 0 400 300' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='300' fill='%2307111f'/%3E%3Cpath d='M-24 218h116c28 0 28-46 56-46h104c28 0 28-66 56-66h116' fill='none' stroke='%23c8f135' stroke-width='12' stroke-linecap='round'/%3E%3Ccircle cx='92' cy='218' r='18' fill='%2307111f' stroke='%23f7f8f2' stroke-width='8'/%3E%3Ccircle cx='252' cy='172' r='12' fill='%23273321'/%3E%3Ccircle cx='308' cy='106' r='7' fill='%23ffbd3f'/%3E%3C/svg%3E",
  },
  {
    name: "cyberpunk",
    family: "standard",
    colors: ["#F171E8", "#002A2B", "#050011"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='cyberGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FF1493;stop-opacity:0.08' /%3E%3Cstop offset='50%25' style='stop-color:%239D4EDD;stop-opacity:0.06' /%3E%3Cstop offset='100%25' style='stop-color:%2300F0FF;stop-opacity:0.08' /%3E%3C/linearGradient%3E%3Cpattern id='grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%23FF1493' stroke-width='0.5' opacity='0.04'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23cyberGrad)'/%3E%3Crect width='400' height='300' fill='url(%23grid)'/%3E%3Ccircle cx='100' cy='80' r='30' fill='%23FF1493' opacity='0.03'/%3E%3Ccircle cx='300' cy='180' r='40' fill='%2300F0FF' opacity='0.03'/%3E%3Ccircle cx='200' cy='220' r='25' fill='%239D4EDD' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "pastel",
    family: "standard",
    colors: ["#DCA0D6", "#153223", "#0F101F"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='pastelGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FFB3D9;stop-opacity:0.08' /%3E%3Cstop offset='50%25' style='stop-color:%23E0BBE4;stop-opacity:0.06' /%3E%3Cstop offset='100%25' style='stop-color:%23B4E7CE;stop-opacity:0.08' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23pastelGrad)'/%3E%3Ccircle cx='80' cy='60' r='50' fill='%23FFB3D9' opacity='0.04'/%3E%3Ccircle cx='320' cy='100' r='60' fill='%23E0BBE4' opacity='0.03'/%3E%3Ccircle cx='150' cy='200' r='70' fill='%23B4E7CE' opacity='0.04'/%3E%3Ccircle cx='280' cy='240' r='45' fill='%23FFB3D9' opacity='0.03'/%3E%3Cpath d='M 50 150 Q 100 100 150 150 T 250 150' stroke='%23E0BBE4' stroke-width='2' fill='none' opacity='0.04'/%3E%3Cpath d='M 200 80 Q 250 50 300 80' stroke='%23FFB3D9' stroke-width='2' fill='none' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "fantasy",
    family: "standard",
    colors: ["#C385EF", "#2B1D36", "#0A0211"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3CradialGradient id='fantasyGrad'%3E%3Cstop offset='0%25' style='stop-color:%234A0E4E;stop-opacity:0.09' /%3E%3Cstop offset='60%25' style='stop-color:%238B0000;stop-opacity:0.06' /%3E%3Cstop offset='100%25' style='stop-color:%23000000;stop-opacity:0.09' /%3E%3C/radialGradient%3E%3Cfilter id='glow'%3E%3CfeGaussianBlur stdDeviation='3' result='coloredBlur'/%3E%3CfeMerge%3E%3CfeMergeNode in='coloredBlur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23fantasyGrad)'/%3E%3Cpolygon points='200,50 210,80 240,80 215,100 225,130 200,110 175,130 185,100 160,80 190,80' fill='%23FFD700' opacity='0.05' filter='url(%23glow)'/%3E%3Cpolygon points='100,150 105,165 120,165 110,175 115,190 100,180 85,190 90,175 80,165 95,165' fill='%23FFD700' opacity='0.04'/%3E%3Cpolygon points='320,180 325,195 340,195 330,205 335,220 320,210 305,220 310,205 300,195 315,195' fill='%23FFD700' opacity='0.04'/%3E%3Ccircle cx='200' cy='150' r='80' fill='%234A0E4E' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "shonen",
    family: "standard",
    colors: ["#FF8769", "#34260C", "#160703"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='shonenGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FF6B35;stop-opacity:0.08' /%3E%3Cstop offset='50%25' style='stop-color:%2300A8E8;stop-opacity:0.06' /%3E%3Cstop offset='100%25' style='stop-color:%23FFD23F;stop-opacity:0.08' /%3E%3C/linearGradient%3E%3Cpattern id='energy' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 30 L 20 10 L 30 30 L 20 50 Z' fill='%23FFD23F' opacity='0.03'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23shonenGrad)'/%3E%3Crect width='400' height='300' fill='url(%23energy)'/%3E%3Cpath d='M 50 100 L 80 50 L 90 100 L 120 60 L 130 100' stroke='%23FFD23F' stroke-width='3' fill='none' opacity='0.05'/%3E%3Cpath d='M 250 180 L 280 130 L 290 180 L 320 140 L 330 180' stroke='%23FF6B35' stroke-width='3' fill='none' opacity='0.05'/%3E%3Ccircle cx='150' cy='150' r='40' fill='%2300A8E8' opacity='0.04'/%3E%3Ccircle cx='300' cy='80' r='35' fill='%23FF6B35' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "onepiece",
    family: "standard",
    colors: ["#57C173", "#122D19", "#000802"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='onepieceGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%232D8659;stop-opacity:0.08' /%3E%3Cstop offset='50%25' style='stop-color:%237FD99A;stop-opacity:0.06' /%3E%3Cstop offset='100%25' style='stop-color:%231A5238;stop-opacity:0.08' /%3E%3C/linearGradient%3E%3Cpattern id='swords' width='80' height='80' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 10 L 30 30 M 10 30 L 30 10' stroke='%232D8659' stroke-width='1' opacity='0.03'/%3E%3Cpath d='M 50 50 L 70 70 M 50 70 L 70 50' stroke='%237FD99A' stroke-width='1' opacity='0.04'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23onepieceGrad)'/%3E%3Crect width='400' height='300' fill='url(%23swords)'/%3E%3Ccircle cx='100' cy='100' r='40' fill='%232D8659' opacity='0.03'/%3E%3Ccircle cx='300' cy='200' r='50' fill='%237FD99A' opacity='0.04'/%3E%3Cpath d='M 150 150 L 170 100 L 175 150 L 180 100 L 185 150 L 200 80' stroke='%232D8659' stroke-width='2' fill='none' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "anime",
    family: "standard",
    colors: ["#FF8CA0", "#36290E", "#1B0508"],
    backgroundImage: "/themes/anime-preview.webp",
  },
  {
    name: "waguri",
    family: "standard",
    colors: ["#F7A062", "#3B2214", "#110917"],
    backgroundImage: "/themes/waguri-preview.webp",
  },
  {
    name: "goth",
    family: "standard",
    colors: ["#E572C2", "#211A34", "#030103"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='gothGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23000000;stop-opacity:0.12' /%3E%3Cstop offset='50%25' style='stop-color:%238B1A3D;stop-opacity:0.08' /%3E%3Cstop offset='100%25' style='stop-color:%236A0DAD;stop-opacity:0.10' /%3E%3C/linearGradient%3E%3Cpattern id='crosses' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 30 10 L 30 50 M 10 30 L 50 30' stroke='%238B1A3D' stroke-width='1.5' opacity='0.04'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23gothGrad)'/%3E%3Crect width='400' height='300' fill='url(%23crosses)'/%3E%3Ccircle cx='100' cy='100' r='35' fill='%236A0DAD' opacity='0.04'/%3E%3Ccircle cx='320' cy='220' r='45' fill='%238B1A3D' opacity='0.05'/%3E%3Cpath d='M 200 80 Q 220 100 200 120 Q 180 100 200 80' fill='%238B1A3D' opacity='0.03'/%3E%3Cpath d='M 280 150 L 290 140 L 300 150 L 290 160 Z' fill='%236A0DAD' opacity='0.04'/%3E%3C/svg%3E",
  },
  {
    name: "halloween",
    family: "standard",
    colors: ["#FF904C", "#311B11", "#0D0000"],
    backgroundImage: "/themes/halloween-preview.webp",
  },
  {
    name: "realmadrid",
    family: "standard",
    colors: ["#6DB0F4", "#1B2024", "#000409"],
    backgroundImage: "/themes/realmadrid-preview.webp",
  },
  {
    name: "realmadrid-3rd",
    family: "standard",
    colors: ["#AFA0FF", "#26213F", "#090616"],
    backgroundImage: "/themes/realmadrid-3rd-preview.webp",
  },
  {
    name: "barcelona",
    family: "standard",
    colors: ["#FF839A", "#0F253B", "#190105"],
    backgroundImage: "/themes/barcelona-preview.webp",
  },
  {
    name: "rukia",
    family: "rukia",
    colors: ["#D2DBEF", "#2E3358", "#101426"],
    backgroundImage: "/themes/rukia-preview.webp",
  },
  {
    name: "rias",
    family: "rias",
    colors: ["#C1122F", "#2A1218", "#0C0709"],
    backgroundImage: "/themes/rias-preview.webp",
  },
  {
    name: "cat-pink",
    family: "cat",
    colors: ["#DFA3BF", "#3E2837", "#201018"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='catPinkGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23F4B8C8;stop-opacity:0.1' /%3E%3Cstop offset='50%25' style='stop-color:%23FDDDE6;stop-opacity:0.07' /%3E%3Cstop offset='100%25' style='stop-color:%23E8A0B4;stop-opacity:0.1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23catPinkGrad)'/%3E%3Cellipse cx='82' cy='80' rx='11' ry='8.5' fill='%23F4B8C8' opacity='0.1'/%3E%3Ccircle cx='70' cy='66' r='4.5' fill='%23F4B8C8' opacity='0.1'/%3E%3Ccircle cx='77' cy='62' r='4' fill='%23F4B8C8' opacity='0.1'/%3E%3Ccircle cx='87' cy='62' r='4' fill='%23F4B8C8' opacity='0.1'/%3E%3Ccircle cx='94' cy='66' r='4.5' fill='%23F4B8C8' opacity='0.1'/%3E%3Cellipse cx='282' cy='200' rx='11' ry='8.5' fill='%23E8A0B4' opacity='0.08' transform='rotate(20 280 200)'/%3E%3Ccircle cx='270' cy='186' r='4.5' fill='%23E8A0B4' opacity='0.08'/%3E%3Ccircle cx='277' cy='182' r='4' fill='%23E8A0B4' opacity='0.08'/%3E%3Ccircle cx='287' cy='182' r='4' fill='%23E8A0B4' opacity='0.08'/%3E%3Ccircle cx='294' cy='186' r='4.5' fill='%23E8A0B4' opacity='0.08'/%3E%3Cellipse cx='202' cy='140' rx='9.5' ry='7.5' fill='%23FDDDE6' opacity='0.06' transform='rotate(-15 200 140)'/%3E%3Ccircle cx='192' cy='128' r='3.8' fill='%23FDDDE6' opacity='0.06'/%3E%3Ccircle cx='198' cy='125' r='3.3' fill='%23FDDDE6' opacity='0.06'/%3E%3Ccircle cx='206' cy='125' r='3.3' fill='%23FDDDE6' opacity='0.06'/%3E%3Ccircle cx='212' cy='128' r='3.8' fill='%23FDDDE6' opacity='0.06'/%3E%3C/svg%3E",
  },
  {
    name: "cat-purple",
    family: "cat",
    colors: ["#B5A3DA", "#302D43", "#251D32"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='catPurpleGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23C9AED6;stop-opacity:0.1' /%3E%3Cstop offset='50%25' style='stop-color:%23E2D1EB;stop-opacity:0.07' /%3E%3Cstop offset='100%25' style='stop-color:%23B499C7;stop-opacity:0.1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23catPurpleGrad)'/%3E%3Cellipse cx='82' cy='80' rx='11' ry='8.5' fill='%23C9AED6' opacity='0.1'/%3E%3Ccircle cx='70' cy='66' r='4.5' fill='%23C9AED6' opacity='0.1'/%3E%3Ccircle cx='77' cy='62' r='4' fill='%23C9AED6' opacity='0.1'/%3E%3Ccircle cx='87' cy='62' r='4' fill='%23C9AED6' opacity='0.1'/%3E%3Ccircle cx='94' cy='66' r='4.5' fill='%23C9AED6' opacity='0.1'/%3E%3Cellipse cx='282' cy='200' rx='11' ry='8.5' fill='%23B499C7' opacity='0.08' transform='rotate(20 280 200)'/%3E%3Ccircle cx='270' cy='186' r='4.5' fill='%23B499C7' opacity='0.08'/%3E%3Ccircle cx='277' cy='182' r='4' fill='%23B499C7' opacity='0.08'/%3E%3Ccircle cx='287' cy='182' r='4' fill='%23B499C7' opacity='0.08'/%3E%3Ccircle cx='294' cy='186' r='4.5' fill='%23B499C7' opacity='0.08'/%3E%3Cellipse cx='202' cy='140' rx='9.5' ry='7.5' fill='%23E2D1EB' opacity='0.06' transform='rotate(-15 200 140)'/%3E%3Ccircle cx='192' cy='128' r='3.8' fill='%23E2D1EB' opacity='0.06'/%3E%3Ccircle cx='198' cy='125' r='3.3' fill='%23E2D1EB' opacity='0.06'/%3E%3Ccircle cx='206' cy='125' r='3.3' fill='%23E2D1EB' opacity='0.06'/%3E%3Ccircle cx='212' cy='128' r='3.8' fill='%23E2D1EB' opacity='0.06'/%3E%3C/svg%3E",
  },
  {
    name: "cat-blue",
    family: "cat",
    colors: ["#88C0DC", "#16353E", "#092531"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='catBlueGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23A8CFE0;stop-opacity:0.1' /%3E%3Cstop offset='50%25' style='stop-color:%23D0E8F2;stop-opacity:0.07' /%3E%3Cstop offset='100%25' style='stop-color:%238FBDD0;stop-opacity:0.1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23catBlueGrad)'/%3E%3Cellipse cx='82' cy='80' rx='11' ry='8.5' fill='%23A8CFE0' opacity='0.1'/%3E%3Ccircle cx='70' cy='66' r='4.5' fill='%23A8CFE0' opacity='0.1'/%3E%3Ccircle cx='77' cy='62' r='4' fill='%23A8CFE0' opacity='0.1'/%3E%3Ccircle cx='87' cy='62' r='4' fill='%23A8CFE0' opacity='0.1'/%3E%3Ccircle cx='94' cy='66' r='4.5' fill='%23A8CFE0' opacity='0.1'/%3E%3Cellipse cx='282' cy='200' rx='11' ry='8.5' fill='%238FBDD0' opacity='0.08' transform='rotate(20 280 200)'/%3E%3Ccircle cx='270' cy='186' r='4.5' fill='%238FBDD0' opacity='0.08'/%3E%3Ccircle cx='277' cy='182' r='4' fill='%238FBDD0' opacity='0.08'/%3E%3Ccircle cx='287' cy='182' r='4' fill='%238FBDD0' opacity='0.08'/%3E%3Ccircle cx='294' cy='186' r='4.5' fill='%238FBDD0' opacity='0.08'/%3E%3Cellipse cx='202' cy='140' rx='9.5' ry='7.5' fill='%23D0E8F2' opacity='0.06' transform='rotate(-15 200 140)'/%3E%3Ccircle cx='192' cy='128' r='3.8' fill='%23D0E8F2' opacity='0.06'/%3E%3Ccircle cx='198' cy='125' r='3.3' fill='%23D0E8F2' opacity='0.06'/%3E%3Ccircle cx='206' cy='125' r='3.3' fill='%23D0E8F2' opacity='0.06'/%3E%3Ccircle cx='212' cy='128' r='3.8' fill='%23D0E8F2' opacity='0.06'/%3E%3C/svg%3E",
  },
  {
    name: "cat-random",
    family: "cat",
    colors: ["#DFA3BF", "#B5A3DA", "#88C0DC"],
    backgroundImage:
      "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='catRandomGrad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23F4B8C8;stop-opacity:0.1' /%3E%3Cstop offset='50%25' style='stop-color:%23C9AED6;stop-opacity:0.08' /%3E%3Cstop offset='100%25' style='stop-color:%23A8CFE0;stop-opacity:0.1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='%23181b25'/%3E%3Crect width='400' height='300' fill='url(%23catRandomGrad)'/%3E%3Cellipse cx='82' cy='80' rx='11' ry='8.5' fill='%23F4B8C8' opacity='0.1'/%3E%3Ccircle cx='70' cy='66' r='4.5' fill='%23F4B8C8' opacity='0.1'/%3E%3Ccircle cx='77' cy='62' r='4' fill='%23F4B8C8' opacity='0.1'/%3E%3Ccircle cx='87' cy='62' r='4' fill='%23F4B8C8' opacity='0.1'/%3E%3Ccircle cx='94' cy='66' r='4.5' fill='%23F4B8C8' opacity='0.1'/%3E%3Cellipse cx='282' cy='200' rx='11' ry='8.5' fill='%23A8CFE0' opacity='0.08' transform='rotate(20 280 200)'/%3E%3Ccircle cx='270' cy='186' r='4.5' fill='%23A8CFE0' opacity='0.08'/%3E%3Ccircle cx='277' cy='182' r='4' fill='%23A8CFE0' opacity='0.08'/%3E%3Ccircle cx='287' cy='182' r='4' fill='%23A8CFE0' opacity='0.08'/%3E%3Ccircle cx='294' cy='186' r='4.5' fill='%23A8CFE0' opacity='0.08'/%3E%3Cellipse cx='202' cy='140' rx='9.5' ry='7.5' fill='%23C9AED6' opacity='0.06' transform='rotate(-15 200 140)'/%3E%3Ccircle cx='192' cy='128' r='3.8' fill='%23C9AED6' opacity='0.06'/%3E%3Ccircle cx='198' cy='125' r='3.3' fill='%23C9AED6' opacity='0.06'/%3E%3Ccircle cx='206' cy='125' r='3.3' fill='%23C9AED6' opacity='0.06'/%3E%3Ccircle cx='212' cy='128' r='3.8' fill='%23C9AED6' opacity='0.06'/%3E%3C/svg%3E",
  },
];
