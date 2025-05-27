export interface Hero {
  d: HeroD;
}

export interface HeroD {
  whoIsHere: string;
  opt: number;
  credits: number;
  runes: number;
  blockade: number;
  id: number;
  account: number;
  uprawnienia: number;
  bagi: number;
  bint: number;
  bstr: number;
  gender: string;
  exp: number;
  gold: number;
  goldlim: number;
  healpower: number;
  honor: number;
  img: string;
  lvl: number;
  mails: number;
  mails_all: number;
  mails_last: string;
  mpath: string;
  nick: string;
  prof: string;
  ttl_value: number;
  ttl_end: number;
  ttl_del: number;
  pvp: number;
  ttl: number;
  x: number;
  y: number;
  dir: number;
  stasis: number;
  stasis_incoming_seconds: number;
  bag: number;
  party: number;
  trade: number;
  wanted: number;
  stamina: number;
  stamina_ts: number;
  stamina_renew_sec: number;
  is_blessed: number;
  attr: number;
  warrior_stats: WarriorStats;
  passive_stats: any;
  matchmaking_champion: number;
  icon: string;
  hpp: number;
}

export interface WarriorStats {
  hp: number;
  maxhp: number;
  st: number;
  ag: number;
  it: number;
  sa: number;
  crit: number;
  ac: number;
  resfire: number;
  resfrost: number;
  reslight: number;
  act: number;
  attack: Attack;
  evade: number[];
  heal: number;
  acdmg: number;
  slow: number;
  fatigs: Fatigs;
  blok: number;
  critval: number;
  energy: number;
  lowevade: number;
  energygain: number;
  wound0: number;
  wound1: number;
  legbon_verycrit: number;
  legbon_holytouch: number[];
  legbon_curse: number;
  legbon_glare: number;
  legbon_lastheal: number[];
  legbon_critred: number;
}

export interface Attack {
  physicalMainHand: PhysicalMainHand;
}

export interface PhysicalMainHand {
  min: number;
  max: number;
  average: number;
}

export interface Fatigs {
  energy: Energy;
  mana: Mana;
}

export interface Energy {
  power: number;
  chance: number;
}

export interface Mana {
  power: number;
  chance: number;
}
