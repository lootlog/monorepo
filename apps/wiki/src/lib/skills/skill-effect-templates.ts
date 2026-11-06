// Generated from the game's skill tooltip parser and Polish dictionary.
import type { SkillEffectTemplate } from "@/lib/skills/skill-effects";

export const SKILL_EFFECT_TEMPLATES = {
  absagain_per: {
    template: "Przywrócenie %val%% absorpcji po celnym ataku",
    value: "plain",
  },
  absorb_per: {
    template: "Wzmocnienie absorpcji fizycznej o %val%%",
    value: "plain",
  },
  absorbd: {
    template: "Absorpcja przeciw broni dystansowej skuteczna w %val%%",
    value: "plain",
  },
  absorbm_per: {
    template: "Wzmocnienie absorpcji magicznej o %val%%",
    value: "plain",
  },
  ac: {
    template: "Pancerz %val%",
    value: "plain",
  },
  ac2_per: {
    template: "Zwiększa pancerz Postaci o %val%%",
    value: "plain",
  },
  ac_per: {
    template:
      "Ty/sojusznik: Zwiększenie pancerza o %val%% bazowego pancerza celu",
    value: "plain",
  },
  acdmg: {
    template: "Niszczy %val% punktów pancerza podczas ciosu",
    value: "plain",
  },
  achpp_per: {
    template:
      "Ty: Zwiększenie pancerza o 1% za każde utracone w trakcie walki %val%% maksymalnego życia",
    value: "plain",
  },
  acshield_per: {
    template: "Ty: Zwiększenie pancerza o %val%% pancerza tarczy",
    value: "plain",
  },
  act: {
    template: "Odporność na truciznę +%val%%",
    value: "plain",
  },
  actdmg: {
    template: "Obniża odporność na truciznę o %val%%",
    value: "plain",
  },
  active_absorbdest_per: {
    template:
      "Przeciwnik: Zniszczenie %val%% bieżącej absorpcji fizycznej oraz magicznej",
    value: "plain",
  },
  active_acdmg_per: {
    template:
      "Ty: Zwiększenie niszczenia pancerza o wartości %val%% pancerza przeciwnika",
    value: "plain",
  },
  "active_acdmg_physical-perw": {
    template:
      "Ty: Zwiększenie niszczenia pancerza o wartości %val%% ataku fizycznego",
    value: "plain",
  },
  active_add_light_cumulaction: {
    template: "Ty: Zwiększenie poziomu kumulacji obrażeń od błyskawic o %val%",
    value: "plain",
  },
  active_block_per: {
    template: "Ty: Zwiększenie szansy na blok o %val% punktów procentowych",
    value: "plain",
  },
  active_crit: {
    template:
      "Ty: Zwiększenie szansy na cios krytyczny o %val% punktów procentowych",
    value: "plain",
  },
  "active_crit-allies": {
    template:
      "Wszyscy sojusznicy: Zwiększenie szansy na cios krytyczny o %val% punktów procentowych",
    value: "plain",
  },
  active_decblock_per: {
    template:
      "Przeciwnik: Zmniejszenie szansy na blok o %val% punktów procentowych",
    value: "plain",
  },
  "active_decblock_per-enemies": {
    template:
      "Wszyscy przeciwnicy: Zmniejszenie szansy na blok o %val% punktów procentowych",
    value: "plain",
  },
  active_decevade_per: {
    template: "Ty: Zwiększenie obniżania uniku o %val% %val3%",
    value: "plain",
    percentPoints: true,
  },
  active_redstun: {
    template: "Ty: Zmniejszenie czasu trwania stanu obezwładnienia o %val%%",
    value: "plain",
  },
  active_wound_per: {
    template:
      "Ty: Podczas ataku w przeciwnika nieobjętego działaniem głębokich ran, zwiększenie szansy na głęboką ranę o %val% punktów procentowych",
    value: "plain",
  },
  "adddmg_fire-perw": {
    template: "Ty: Dodatkowe obrażenia od ognia o mocy %val%% ataku ogniem",
    value: "plain",
  },
  "adddmg_physical-perw": {
    template: "Ty: Dodatkowe obrażenia fizyczne o mocy %val%% ataku fizycznego",
    value: "plain",
  },
  adrenalin_evade: {
    template:
      "Zwiększenie uniku o %val% punktów procentowych, gdy życie spadnie poniżej %val2%%",
    value: "pair",
  },
  adrenalin_reddest: {
    template:
      "Zwiększenie redukcji niszczenia many i energii o %val%%, gdy życie spadnie poniżej %val2%%",
    value: "pair",
  },
  adrenalin_sa: {
    template:
      "Zwiększenie szybkości ataku o %val%%, gdy życie spadnie poniżej %val2%%",
    value: "pair",
  },
  agi: {
    template: "Atak broni dystansowej %val%% zręczności (efekt pasywny)",
    value: "percent100",
  },
  alllowdmg: {
    template:
      "Wszyscy przeciwnicy: Zmniejszenie wyprowadzanych obrażeń o %val%%",
    value: "plain",
  },
  allslow_per: {
    template: "Wszyscy przeciwnicy: Zmniejszenie o %val%% szybkości ataku",
    value: "plain",
  },
  antidote: {
    template:
      "Ty: Zwiększenie odporności na truciznę o %val% punktów procentowych",
    value: "plain",
  },
  arrowblock: {
    template: "Podczas obrony szansa na zneutralizowanie strzały/bełtu %val%%",
    value: "plain",
  },
  "aura-ac_per": {
    template:
      "Wszyscy sojusznicy: Zwiększenie pancerza o %val%% bazowego pancerza, działające z połową skuteczności na rzucającym czar",
    value: "plain",
  },
  "aura-adddmg2_per-meele_physical": {
    template:
      "Wszyscy sojusznicy: Zwiększenie obrażeń fizycznych wyprowadzanych w zwarciu o %val%%",
    value: "plain",
  },
  "aura-resall": {
    template:
      "Wszyscy sojusznicy: Zwiększenie odporności magicznych o %val% punktów procentowych, działające z połową skuteczności na rzucającym czar",
    value: "plain",
  },
  "aura-sa_per": {
    template:
      "Wszyscy sojusznicy: Zwiększenie szybkości ataku o %val%%, działające z połową skuteczności na rzucającym czar",
    value: "plain",
  },
  bandage_per: {
    template:
      "Ty: Uleczenie %val%% maksymalnego życia, pomniejszane wraz z każdym użyciem o 25% wartości początkowej",
    value: "plain",
  },
  blok_per: {
    template: "Blok zwiększony o %val%%",
    value: "signed",
  },
  "combo-block": {
    template: "+%val% pkt kombinacji za każdy zablokowany cios (efekt pasywny)",
    value: "plain",
  },
  "combo-crit": {
    template:
      "+%val% pkt kombinacji za każdy zadany cios krytyczny (efekt pasywny)",
    value: "plain",
  },
  "combo-max": {
    template:
      "Zużywa wszystkie punkty kombinacji oraz dodaje bonus za maksymalnie %val% pkt",
    value: "plain",
  },
  "combo-pierce": {
    template:
      "+%val% pkt kombinacji za każdy atak z przebiciem (efekt pasywny)",
    value: "plain",
  },
  "combo-skill": {
    template: "Ty: Wygenerowanie %val% punktu kombinacji",
    value: "plain",
  },
  "combo-wound": {
    template:
      "+%val% pkt kombinacji za każdą zadaną głęboką ranę (efekt pasywny)",
    value: "plain",
  },
  "combo_dmg_hpp-target": {
    template:
      "Ty: Zadanie obrażeń nieuchronnych o mocy %val%% maksymalnego życia celu za każdy punkt kombinacji",
    value: "plain",
  },
  combo_energyrestore_per: {
    template:
      "Ty: Przywrócenie %val%% maksymalnej energii za każdy punkt kombinacji",
    value: "plain",
  },
  combo_heal_per: {
    template:
      "Ty: Uleczenie %val%% maksymalnego życia za każdy punkt kombinacji",
    value: "plain",
  },
  combo_lowdmg_enemy: {
    template:
      "Przeciwnik: Zmniejszenie wyprowadzanych obrażeń o %val%% za każdy punkt kombinacji",
    value: "plain",
  },
  contra: {
    template: "+%val%% szans na kontratak po ciosie krytycznym",
    value: "plain",
  },
  cooldown: {
    template: "Czas odnowienia: %val% ",
    value: "plain",
  },
  crit: {
    template: "Cios krytyczny %val%%",
    value: "plain",
  },
  "critmval-allies": {
    template:
      "Wszyscy sojusznicy: Zwiększenie mocy ciosu krytycznego magicznego o %val% punktów procentowych",
    value: "plain",
  },
  "critmval-enemies": {
    template:
      "Wszyscy przeciwnicy: Zmniejszenie mocy ciosu krytycznego magicznego o %val% punktów procentowych",
    value: "plain",
  },
  critmval_c: {
    template: "Moc krytycznego uderzenia magii zimna +%val%%",
    value: "plain",
  },
  critmval_f: {
    template: "Moc krytycznego uderzenia magii ognia +%val%%",
    value: "plain",
  },
  critmval_l: {
    template: "Moc krytycznego uderzenia magii błyskawic +%val%%",
    value: "plain",
  },
  critpierce_per: {
    template:
      "Zwiększenie niszczenia pancerza o %val%% podczas przebicia pancerza przeciwnika ciosem krytycznym",
    value: "plain",
  },
  critpoison: {
    template:
      "Ciosy krytyczne mają %val2%% na osłabienie następnego przywrócenia życia przeciwnika o %val%%",
    value: "pair",
  },
  critrage_perw: {
    template:
      "Dodatkowe %val%% obrażeń od wściekłości, jeżeli życie spadło poniżej 25%",
    value: "plain",
  },
  critsa: {
    template:
      "Ciosy krytyczne mają %val2%% na zwiększenie szybkości ataku o %val%% na 3 tury",
    value: "pair",
  },
  critslow_per: {
    template: "Spowolnienie przeciwnika o %val%% po krytyku",
    value: "plain",
  },
  critval: {
    template: "Moc ciosu krytycznego fizycznego %val%%",
    value: "plain",
  },
  "critval-allies": {
    template:
      "Wszyscy sojusznicy: Zwiększenie mocy ciosu krytycznego fizycznego o %val% punktów procentowych",
    value: "plain",
  },
  "critval-enemies": {
    template:
      "Wszyscy przeciwnicy: Zmniejszenie mocy ciosu krytycznego fizycznego o %val% punktów procentowych",
    value: "plain",
  },
  critwound: {
    template: "Ciężka rana %val%% szans po krytyku",
    value: "plain",
  },
  crush_dmg_physical: {
    template:
      "Dodatkowe obrażenia nieuchronne o mocy %val%% zadanych obrażeń fizycznych, gdy %val2%% obrażeń fizycznych pominie defensywę przeciwnika",
    value: "pair",
  },
  decblock_per: {
    template: "Zmniejszenie bloku przeciwnika o %val% punktów procentowych",
    value: "plain",
  },
  decevade_per: {
    template: "Obniżenie uniku przeciwnika o %val% %val3% ",
    value: "plain",
    percentPoints: true,
  },
  distract: {
    template: "Szansa %val%% na wytrącenie z równowagi po krytyku",
    value: "plain",
  },
  disturb_crit: {
    template:
      "Przeciwnik: Obniżenie szansy na cios krytyczny o %val% punktów procentowych",
    value: "plain",
  },
  disturb_pierce: {
    template:
      "Przeciwnik: Zmniejszenie szansy na przebicie o %val% punktów procentowych",
    value: "plain",
  },
  "dmg-swing_absolute-perw": {
    template:
      "3 innych, losowych przeciwników w zasięgu: Przyjęcie obrażeń nieuchronnych o mocy %val%% ataku fizycznego rzucającego czar",
    value: "plain",
  },
  "dmg-target_absolute": {
    template: "Ty: Zadanie %val% obrażeń nieuchronnych",
    value: "plain",
  },
  "dmg-target_fire-perw": {
    template: "Ty: Zadanie obrażeń od ognia o mocy %val%% ataku ogniem",
    value: "plain",
  },
  "dmg_evade_hpp-target": {
    template:
      "Ty: Podczas trafionego ataku zadanie obrażeń nieuchronnych o mocy %val%% maksymalnego życia celu",
    value: "plain",
  },
  "dmg_evade_hpp-target_light": {
    template:
      "Ty: Podczas trafionego ataku zadanie obrażeń od błyskawic o mocy %val%% maksymalnego życia celu",
    value: "plain",
  },
  dmg_from_npc_per: {
    template: "Obrażenia otrzymywane od potworów: %val%%",
    value: "plain",
  },
  dmg_from_player_per: {
    template: "Obrażenia otrzymywane od Graczy %val%%",
    value: "plain",
  },
  dmg_to_npc_per: {
    template: "Obrażenia zadawane potworom zwiększone o %val%%",
    value: "plain",
  },
  dmgmulabsolute: {
    template: "Obrażenia nieuchronne %val% %val3%",
    value: "signed",
    percentPoints: true,
  },
  doublecastcost_per: {
    template:
      "Ty: Zwiększenie kosztu umiejętności o %val%% po użyciu jej drugi raz z rzędu",
    value: "plain",
  },
  "en-regen": {
    template: "Ty: Odzyskiwanie %val% energii wraz z turą",
    value: "plain",
  },
  energy: {
    template: "Koszt energii: %val%",
    value: "plain",
  },
  energybon: {
    template: "Energia %val%",
    value: "signed",
  },
  energygain: {
    template: "Energia %val% co turę",
    value: "signed",
  },
  energyout: {
    template: "Przeciwnik: Marnowanie %val%  energii wraz z turą",
    value: "plain",
  },
  energyrestore_per: {
    template:
      "Ty: Przywrócenie %val%% maksymalnej energii, pomniejszane wraz z każdym użyciem o 10%",
    value: "plain",
  },
  engback: {
    template: "Odzyskanie %val%% energii po krytyku",
    value: "plain",
  },
  evade_per: {
    template: "Zwiększenie o %val% %val3% posiadanego uniku",
    value: "plain",
    percentPoints: true,
  },
  fastarrow: {
    template: "%val%% szans 4-krotnie szybsze oddanie strzału",
    value: "plain",
  },
  firebon: {
    template: "Atak ogniem %val%% intelektu (efekt pasywny)",
    value: "percent100",
  },
  freeze: {
    template: "Ty: Zwiększenie szansy na zamrożenie o %val%%",
    value: "plain",
  },
  frostbon: {
    template: "Atak zimnem %val%% intelektu (efekt pasywny)",
    value: "percent100",
  },
  heal1_per: {
    template: "Przywracanie życia z posiadanego ekwipunku +%val%%",
    value: "plain",
  },
  heal_per: {
    template:
      "Ty/sojusznik: Uleczenie %val%% maksymalnego życia, pomniejszane wraz z każdym użyciem o 25% wartości początkowej",
    value: "plain",
  },
  "heal_per-allies": {
    template: "Przywracanie życia sojuszników +%val%%",
    value: "plain",
  },
  "heal_per-enemies": {
    template: "Przywracanie życia przeciwników %val%%",
    value: "plain",
  },
  healall_per: {
    template:
      "Wszyscy sojusznicy: Uleczenie %val%% maksymalnego życia, pomniejszane wraz z każdym użyciem o 25% wartości początkowej",
    value: "plain",
  },
  healpower: {
    template: "Zwiększenie leczenia z przedmiotów leczących o %val%%",
    value: "plain",
  },
  hp: {
    template: "Życie %val%",
    value: "signed",
  },
  "hp_per-allies": {
    template: "Aura życia: +%val%% maksymalnego życia dla sojuszników",
    value: "plain",
  },
  hpbon: {
    template: "+%val% życia za 1 pkt siły",
    value: "plain",
  },
  immunity_to_dmg: {
    template: "Ty: Niewrażliwość na przyjęcie obrażeń",
    value: "plain",
  },
  injure: {
    template: "Szansa %val%% na zranienie przeciwnika",
    value: "plain",
  },
  lastcrit: {
    template: "+%val%% na ciosy krytyczne, gdy cel ma poniżej %val2%% życia",
    value: "pair",
  },
  lightbon: {
    template: "Atak błyskawicami %val%% intelektu (efekt pasywny)",
    value: "percent100",
  },
  lightshield_per: {
    template:
      "Ty/sojusznik: Podczas obrony spowalnianie atakującego o %val%% i odbijanie losowo 6-14% obrażeń wyprowadzonych jako obrażenia nieuchronne",
    value: "plain",
  },
  lowdmg_enemy: {
    template: "Przeciwnik: Zmniejszenie wyprowadzanych obrażeń o %val%%",
    value: "plain",
  },
  lowdmg_self: {
    template: "Ty: Zmniejszenie wyprowadzanych obrażeń o %val%%",
    value: "plain",
  },
  "lowheal_per-enemies": {
    template: "Wszyscy przeciwnicy: Zmniejszenie uleczeń o %val%%",
    value: "plain",
  },
  mana: {
    template: "Koszt many: %val%",
    value: "plain",
  },
  manabon: {
    template: "Mana %val%",
    value: "signed",
  },
  manaendest: {
    template: "Ty: Zniszczenie %val% many i %val3% energii celu",
    value: "plain",
  },
  managain: {
    template: "Mana %val% co turę",
    value: "signed",
  },
  manarestore_per: {
    template:
      "Ty: Przywrócenie %val%% maksymalnej many, pomniejszane wraz z każdym użyciem o 10%",
    value: "plain",
  },
  manastr: {
    template: "Mana +%val%*intelekt",
    value: "plain",
  },
  "of-crit": {
    template: "Cios krytyczny broni pomocniczej +%val%%",
    value: "plain",
  },
  "of-critval": {
    template: "Moc ciosu krytycznego pom. +%val%%",
    value: "plain",
  },
  "of-str": {
    template: "Atak broni pomocniczej %val%% siły (efekt pasywny)",
    value: "percent100",
  },
  "of-thirdatt": {
    template: "%val%% szans na 3 atak",
    value: "plain",
  },
  "of-wounddmgbon_perw": {
    template:
      "Zwiększa o %val%% obrażenia od głębokiej rany w broni pomocniczej",
    value: "plain",
  },
  parry: {
    template: "+%val%% szans na sparowanie ataku",
    value: "plain",
  },
  pcontra: {
    template: "%val%% szans na kontratak po parowaniu",
    value: "plain",
  },
  perdmg: {
    template: "Ty: Zwiększenie wyprowadzanych obrażeń o %val%%",
    value: "plain",
  },
  "perdmg-allies": {
    template: "Wszyscy sojusznicy: Zwiększenie wyprowadzanych obrażeń o %val%%",
    value: "plain",
  },
  pierce: {
    template: "Przebicie pancerza +%val%%",
    value: "plain",
  },
  pierceb: {
    template: "%val%% szans na zablokowanie przebicia",
    value: "signed",
  },
  "poison_lowdmg_per-enemies": {
    template:
      "Osłabienie o %val%% zadawanych obrażeń przez zatrutych przeciwników",
    value: "plain",
  },
  "poisonbon_poison-perw": {
    template: "Ty: Zwiększenie obrażeń aplikowanej trucizny o %val%%",
    value: "plain",
  },
  rage: {
    template: "Wściekłość %val%%turn% po otrzymaniu krytyka",
    value: "plain",
  },
  rage_3turns: {
    template:
      "Zwiększenie ataku fizycznego o %val%% na 3 tury po otrzymaniu ciosu krytycznego",
    value: "plain",
  },
  "red-sa": {
    template: "Ty: Zmniejszenie czasu trwania ruchu o %val%%",
    value: "plain",
  },
  redabdest_per: {
    template: "Redukcja niszczenia absorpcji: %val%%",
    value: "plain",
  },
  redacdmg_per: {
    template: "Przyjmowane podczas obrony niszczenie pancerza %val%%",
    value: "plain",
  },
  reddest_per: {
    template: "Redukcja niszczenia many i energii o %val%%",
    value: "plain",
  },
  redslow: {
    template:
      "Redukowanie wszelakich spowolnień z przedmiotów przeciwnika o %val%%",
    value: "plain",
  },
  redstun: {
    template: "Czas obezwładnienia zostaje zmniejszony o %val%%",
    value: "plain",
  },
  "removedot-allies": {
    template: "Usunięcie obrażeń warunkowych ze swojej drużyny.",
    value: "plain",
  },
  "removestun-allies": {
    template: "Wszyscy sojusznicy: Oczyszczenie ze stanu obezwładnienia",
    value: "plain",
  },
  resdmg: {
    template: "Niszczenie odporności magicznych o %val%% podczas ciosu",
    value: "plain",
  },
  resfire: {
    template: "Odporność na ogień +%val%%",
    value: "plain",
  },
  resfire_per: {
    template:
      "Ty: Zwiększenie odporności na ogień o %val% punktów procentowych",
    value: "plain",
  },
  resfrost: {
    template: "Odporność na zimno +%val%%",
    value: "plain",
  },
  resfrost_per: {
    template:
      "Ty: Zwiększenie odporności na zimno o %val% punktów procentowych",
    value: "plain",
  },
  reslight: {
    template: "Odporność na błyskawice +%val%%",
    value: "plain",
  },
  reslight_per: {
    template:
      "Ty: Zwiększenie odporności na błyskawice o %val% punktów procentowych",
    value: "plain",
  },
  "sa-clothes": {
    template: "Szybkość ataku ubrań zwiększona o %val%%",
    value: "plain",
  },
  sa1: {
    template: "Szybkość ataku +%val% ",
    value: "plain",
  },
  sa2_per: {
    template: "Ty: Zwiększenie szybkości ataku o %val%%",
    value: "plain",
  },
  sa_per: {
    template: "Ty: Zwiększenie szybkości ataku o %val%%",
    value: "plain",
  },
  shout: {
    template: "Ty: Skupienie uwagi %val%",
    value: "plain",
  },
  slow: {
    template: "Obniżenie szybkości ataku przeciwnika o %val%",
    value: "signed",
  },
  slowfreeze_per: {
    template: "Ty: Wzmocnienie spowolnienia z broni od zimna o %val%%",
    value: "plain",
  },
  stealmana_per: {
    template:
      "Ty: Kradzież bieżącej many celu w wysokości %val%% jego maksymalnej puli many",
    value: "plain",
  },
  stinkbomb_crit: {
    template:
      "Przeciwnik: Zmniejszenie szansy na cios krytyczny o %val% punktów procentowych",
    value: "plain",
  },
  stinkbomb_pierce: {
    template:
      "Przeciwnik: Zmniejszenie szansy na przebicie o %val% punktów procentowych",
    value: "plain",
  },
  str1h: {
    template: "Atak broni jednoręcznej %val%% siły (efekt pasywny)",
    value: "percent100",
  },
  str2h: {
    template: "Atak broni dwuręcznej %val%% siły (efekt pasywny)",
    value: "percent100",
  },
  stun: {
    template: "Ty: Zwiększenie szansy na ogłuszenie o %val%%",
    value: "plain",
  },
  sunshield_per: {
    template:
      "Ty: Zwiększenie pancerza i przywracania życia o %val%% bazowych wartości, malejące proporcjonalnie co turę",
    value: "plain",
  },
  swing: {
    template: "Szansa %val%% na dodatkowe zranienie do 3 przeciwników",
    value: "plain",
  },
  taken_dmg_per: {
    template:
      "Zwiększenie obrażeń zadanych w przeciwnika o %val%% obrażeń wykonanych",
    value: "plain",
  },
  "taken_dmg_per-all": {
    template:
      "Wszyscy przeciwnicy: Podczas obrony otrzymywanie dodatkowych obrażeń nieuchronnych o mocy %val%% obrażeń wyprowadzonych",
    value: "plain",
  },
  vamp_time_per: {
    template: "Ty: Leczenie za %val%% zadanych obrażeń",
    value: "plain",
  },
  vulture_perw: {
    template:
      "Zwiększenie zadawanych obrażeń fizycznych o %val%%, gdy przeciwnik posiada poniżej 20% HP",
    value: "plain",
  },
  woundchance: {
    template: "+%val%% szans na głęboką ranę",
    value: "plain",
  },
  wounddmgbon_perw: {
    template: "Zwiększa o %val%% obrażenia od głębokiej rany broni głównej",
    value: "plain",
  },
  woundred: {
    template: "Obrażenia od głębokich ran zmniejszone o %val%%",
    value: "plain",
  },
} satisfies Record<string, SkillEffectTemplate>;
