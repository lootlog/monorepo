# Margonem Combat Log Keys

This document is a developer reference for the `m` entries consumed by
`@lootlog/battle-processor`.

It is based on three sources:

- the official Margonem combat mechanics article:
  <https://pomoc.margonem.pl/index/view%2C372>;
- the current implementation in `packages/battle-processor/src/index.ts`;
- observed PvP, Otchlan (Abyss), and group PvP payloads stored by Lootlog.

The processor is a log analytics tool. It does not simulate Margonem combat from
first principles. It explains and aggregates what is visible in battle logs.

## Row Format

Battle event payloads contain move rows under `event.f.m`:

```txt
attackerId=attackerHp%;defenderId=defenderHp%;action=value;flag;action=value,extra
```

Examples:

```txt
617=100.00;23476=99.67;+of_crit;+critslow_per=10;+dmg=6648;+dmgo=10558;+acdmg=171;-blok=1994;-legbon_facade=13;-dmg=0;-dmgo=383
23476=100.00;617=100.00;tspell=Szarża;skillId=130
617=95.72;0;wound=2817,20
0;0;txt=Demodras - utrata tury
```

The first two semicolon-separated segments identify the actor and target:

| Segment       | Meaning                                                 |
| ------------- | ------------------------------------------------------- |
| `617=100.00`  | actor id `617`, actor HP after this row is `100.00%`    |
| `23476=99.67` | target id `23476`, target HP after this row is `99.67%` |
| `0`           | no direct warrior actor/target for this row             |

All remaining segments are actions. An action can be:

| Shape             | Example         | Meaning                                                   |
| ----------------- | --------------- | --------------------------------------------------------- |
| `key=value`       | `+dmg=7639`     | action with a numeric or textual parameter                |
| `key=value,extra` | `wound=2817,20` | first value is numeric; extra parts carry effect metadata |
| `flag`            | `+crit`         | boolean/marker action; processor numeric value is `0`     |
| `key=text`        | `tspell=Szarża` | textual action                                            |

Numeric parsing is intentionally defensive:

- the processor parses only the first comma-separated value;
- numeric values are stored as absolute values, and direction comes from the key;
- missing or non-numeric values resolve to `0`;
- raw `param` is still kept in timeline actions for inspection.

## Actor And Target Semantics

Most `+...` keys describe something produced by the actor. Most `-...` keys
describe what happened after target-side defense, resistance, or mitigation.

This convention is not universal, so the processor uses explicit key groups:

- damage dealt keys increase actor damage totals;
- damage taken keys increase actor post-defense dealt damage and target taken
  damage;
- passive damage keys usually apply to the row actor because rows such as
  `617=95.72;0;wound=2817,20` have no direct target;
- defensive keys such as `-blok` and `-evade` are counted on the defender;
- `txt`, `winner`, and `loser` are system/outcome rows and may have no actor.

## Skill Rows

Skill rows usually look like this:

```txt
23476=100.00;617=100.00;tspell=Szarża;skillId=130
```

| Key        | Processor behavior                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `tspell`   | Skill/spell display name. This can be Polish text and is stored in `spellsUsedMap` and `warriorMechanics.spells[].name`.              |
| `skillId`  | Numeric skill identity. The processor uses this for follow-up logic.                                                                  |
| `+oth_dmg` | With an active spell row, treated as spell true/auxiliary follow-up damage. Without an active spell row, treated as reflected damage. |

Important: `tspell` is not a stable skill id. Use `skillId` for identity and
follow-up behavior. The processor currently treats `skillId` `97` and `239` as
skills with two follow-up attacks; other skills consume one follow-up attack.

## Damage Keys

Damage is split into pre-defense actor output and post-defense target impact.
The official mechanics article discusses damage type, armor/resistance,
absorption, legendary resistance, and zeroing effects as separate parts of
damage resolution; the log exposes several of those steps as separate keys.

### Dealt Damage

Regular dealt-damage keys increase `warrior.damageDealt` and the listed damage
family. Special damage-effect keys are also classified as timeline damage, but
their flat warrior fields stay in their dedicated buckets.

| Key          | Family                | Notes                                                                                                |
| ------------ | --------------------- | ---------------------------------------------------------------------------------------------------- |
| `+dmgd`      | `distanceDamage`      | Ranged/physical distance damage.                                                                     |
| `+dmg`       | `meleeDamage`         | Physical/melee damage in current processor naming.                                                   |
| `+dmgo`      | `auxiliaryDamage`     | Auxiliary/offhand/additional damage.                                                                 |
| `+dmga`      | `auxiliaryDamage`     | Auxiliary taken/damage family observed in R2 logs.                                                   |
| `+dmgf`      | `fireDamage`          | Fire damage.                                                                                         |
| `+dmgc`      | `frostDamage`         | Cold/frost damage.                                                                                   |
| `+dmgl`      | `lightningDamage`     | Lightning damage.                                                                                    |
| `+thirdatt`  | `thirdAttDamage`      | Third attack damage.                                                                                 |
| `+rage`      | `rageDamageDealt`     | Rage damage; timeline damage for actor and target.                                                   |
| `+taken_dmg` | `stigmaDamageDealt`   | Stigma-like damage; timeline damage for actor and target, flat target bucket is `stigmaDamageTaken`. |
| `+oth_dmg`   | true/reflected damage | Spell context decides whether this is spell true damage or reflected damage.                         |

### Taken / Post-Defense Damage

These keys increase actor `damageDealtAfterDefensive`. If a defender exists,
they also increase defender `damageTaken`, the listed taken family, and
`flatDamageTaken`.

| Key         | Family                 |
| ----------- | ---------------------- |
| `-dmgd`     | `distanceDamageTaken`  |
| `-dmg`      | `meleeDamageTaken`     |
| `-dmgo`     | `auxiliaryDamageTaken` |
| `-dmga`     | `auxiliaryDamageTaken` |
| `-dmgf`     | `fireDamageTaken`      |
| `-dmgc`     | `frostDamageTaken`     |
| `-dmgl`     | `lightningDamageTaken` |
| `-thirdatt` | `thirdAttDamageTaken`  |

`-dmg=0` is meaningful. It often means the row carried an attempted attack, but
the final post-defense damage was zero because another defense, resistance, or
zeroing effect applied.

## Passive And Effect Damage

These rows normally use the affected warrior as the actor and `0` as target.

| Key         | Processor aggregate                                                |
| ----------- | ------------------------------------------------------------------ |
| `wound`     | `woundDamageTaken`, `damageTaken`, effect-damage timeline metadata |
| `critwound` | `critWoundDamageTaken`, `damageTaken`                              |
| `poison`    | `poisonDamageTaken`, `damageTaken`                                 |
| `injure`    | `injureDamageTaken`, `damageTaken`                                 |
| `fire`      | `firePassiveDamageTaken`, `damageTaken`                            |
| `light`     | `lightningPassiveDamageTaken`, `damageTaken`                       |
| `anguish`   | `legbonAnguishDamageTaken`, `damageTaken`                          |

Example:

```txt
617=95.72;0;wound=2817,20
```

The processor reads the first value as `2817`. The `20` is retained in raw
timeline action params but is not currently used as a duration formula.

## Defense, Mitigation, And Counters

These keys are visible target-side defensive events.

| Key           | Processor aggregate                                        | Timeline flag/category      |
| ------------- | ---------------------------------------------------------- | --------------------------- |
| `-evade`      | defender `evasions`, actor `attacksEvaded`                 | `evade`, `mitigation`       |
| `-blok`       | defender `blocks`, `blockedDamage`; actor `attacksBlocked` | `block`, `mitigation`       |
| `-block`      | same as `-blok`                                            | `block`, `mitigation`       |
| `-parry`      | same block bucket, with parry flag                         | `parry`, `mitigation`       |
| `-arrowblock` | same block bucket, with arrow-block flag                   | `arrowBlock`, `mitigation`  |
| `-pierceb`    | same block bucket, with pierce-block flag                  | `pierceBlock`, `mitigation` |
| `-contra`     | defender `counters`                                        | `counter`                   |

`-contra` is intentionally not counted as mitigation. It means counterattack,
not prevented damage.

If a block-like key has no value, for example `-blok`, the event still counts as
a block, but `blockedDamage` increases by `0`.

The processor also recognizes these defensive/modifier keys for timeline
coverage, but does not currently turn them into the same warrior aggregates as
block/evade:

| Key                           | Meaning in analytics                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| `active_decblock_per`         | active block-reduction modifier, recognized as mitigation metadata |
| `active_decblock_per-enemies` | enemy-side active block-reduction modifier                         |
| `alllowdmg`                   | low/all damage modifier, recognized as mitigation metadata         |

## Healing Keys

| Key                     | Processor aggregate                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `heal`                  | actor `passiveHealing`                                                               |
| `bandage`               | actor `activeHealing`                                                                |
| `heal_target`           | target `activeHealing`; actor `warriorMechanics.targetHealing` in timeline analytics |
| `healall_per`           | recognized as healing coverage metadata                                              |
| `lowheal_per-enemies`   | recognized as healing coverage metadata                                              |
| `achpp_per`             | recognized as healing coverage metadata                                              |
| `legbon_lastheal`       | legendary last-heal count and value                                                  |
| `legbon_holytouch_heal` | holy-touch heal value                                                                |

Example:

```txt
617=100.00;0;heal=2814
```

This is a self/passive healing tick for warrior `617`, not a targeted attack.

## Absorption Keys

The official mechanics article treats absorption as part of damage resolution.
The combat log exposes both physical and magical absorption events.

| Key                     | Timeline / mechanics behavior                                             |
| ----------------------- | ------------------------------------------------------------------------- |
| `+absorb`               | actor physical absorption gained                                          |
| `+abdest`               | actor physical absorption gained/destroyed metadata in `warriorMechanics` |
| `+abdest_per`           | actor physical absorption percentage metadata in `warriorMechanics`       |
| `active_absorbdest_per` | active absorption destruction metadata in `warriorMechanics`              |
| `+absorbm`              | actor magic absorption gained                                             |
| `+abmdest_per`          | actor magic absorption percentage metadata in `warriorMechanics`          |
| `-absorb`               | target physical absorption spent; timeline mitigation                     |
| `-absorbm`              | target magic absorption spent; timeline mitigation                        |

Absorption contributes to the timeline mitigation family, but it is tracked
separately from block/evade counters.

## Resource Keys

Resource pressure is split into energy pressure and mana pressure.

| Key         | Timeline / pressure behavior                                                   |
| ----------- | ------------------------------------------------------------------------------ |
| `energy`    | actor `resourceDelta` decreases by value                                       |
| `en-regen`  | actor `resourceDelta` increases by value                                       |
| `+energy`   | actor `resourceDelta` increases                                                |
| `+engback`  | actor `resourceDelta` increases                                                |
| `energyout` | actor `resourceDelta` decreases by value; no pressure because it is self-spend |
| `+endest`   | actor `resourceDelta` decreases by value; no pressure because it is self-spend |
| `-endest`   | defender `destroyedEnergy`; actor energy pressure                              |
| `mana`      | actor `resourceDelta` decreases by value                                       |
| `-manadest` | defender `destroyedMana`; actor mana pressure                                  |
| `stealmana` | defender mana loss, actor mana pressure                                        |

Rows such as `-endest=12,3` use `12` as the numeric value. Extra metadata is
kept in the raw action param.

## Control And Turn Loss

| Key                      | Processor behavior                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `+stun`, `stun`          | control action; timeline `stun` flag                                                       |
| `+freeze`, `freeze`      | control action; timeline `freeze` flag                                                     |
| `+slow`                  | control/debuff metadata                                                                    |
| `+critslow_per`          | critical slow modifier; recognized as control metadata                                     |
| `+distract`              | control metadata                                                                           |
| `removestun-allies`      | control-removal metadata                                                                   |
| `removeslow-allies`      | control-removal metadata                                                                   |
| `txt=Name - utrata tury` | increments matching warrior `turns` and `turnsLost`; timeline marks control-like turn loss |
| `txt=Name poddał walkę`  | marks surrender if the text matches the supported pattern                                  |

The processor normalizes warrior names for `txt` matching, so Polish diacritics
are tolerated in name comparisons.

## Buffs And Debuffs

These keys are recognized for action coverage and timeline labels. Some are
also aggregated directly.

| Key                      | Current aggregation                                            |
| ------------------------ | -------------------------------------------------------------- |
| `+pierce`                | actor `armorPierces`                                           |
| `+crit`                  | actor `criticalHits`                                           |
| `+fastarrow`             | actor `fastArrows`                                             |
| `+injure`                | defender `injures`                                             |
| `+wound`                 | buff/effect marker; not the same as `wound` damage tick        |
| `+woundpoison`           | buff/effect marker                                             |
| `+of_crit`               | observed offensive critical modifier metadata                  |
| `+critwound`             | critical wound marker; damage tick is `critwound` without plus |
| `+crush_physical`        | physical crush modifier metadata                               |
| `+crush_distance`        | distance crush modifier metadata                               |
| `+critpierce`            | critical pierce modifier metadata                              |
| `+spell-taken_dmg-all`   | spell taken-damage modifier metadata                           |
| `aura-sa_per`            | aura speed modifier metadata                                   |
| `aura-adddmg2_per-meele` | aura added-damage modifier metadata                            |
| `critval-allies`         | allies critical-value modifier metadata                        |
| `critmval-allies`        | allies magic-critical modifier metadata                        |
| `absolute`               | absolute/zeroing-effect metadata                               |
| `+exp`                   | exp marker, recognized but outside combat analytics scope      |
| `+acdmg`                 | actor `reducedArmor`                                           |
| `+actdmg`                | actor `reducedPoisonResistance`                                |
| `+resdmg`                | actor `magicResistanceDestroyed`                               |
| `-redabdest_per`         | absorption-destruction reduction metadata                      |
| `-poison_lowdmg_per`     | poison low-damage modifier metadata                            |
| `critwound`              | also handled as passive damage taken                           |

## Legendary Bonus Keys

Legendary bonuses are shown as individual action keys. Some are actor-side
effects, some are target-side defensive effects.

| Key                     | Bonus                      | Processor aggregate                                           |
| ----------------------- | -------------------------- | ------------------------------------------------------------- |
| `+legbon_curse`         | Curse                      | actor `legbonCurse`                                           |
| `-legbon_cleanse`       | Fiery cleanse              | defender `legbonCleanse`                                      |
| `legbon_lastheal`       | Last heal                  | affected warrior `legbonLastheal`, `legbonLasthealValue`      |
| `-legbon_glare`         | Glare/blind                | defender `legbonGlare`                                        |
| `+legbon_holytouch`     | Holy touch                 | actor `legbonHolytouch`                                       |
| `legbon_holytouch_heal` | Holy touch healing         | actor `legbonHolytouchValue`                                  |
| `-legbon_critred`       | Critical shield            | defender `legbonCritredValue`                                 |
| `-legbon_facade`        | Facade of care             | defender `legbonFacadeValue`                                  |
| `+legbon_verycrit`      | Very critical hit          | actor `legbonVerycrit`                                        |
| `+legbon_anguish`       | Bloody anguish             | actor `legbonAnguish`                                         |
| `anguish`               | Bloody anguish damage tick | affected warrior `legbonAnguishDamageTaken` and `damageTaken` |
| `+legbon_puncture`      | Puncturing effectiveness   | actor `legbonPunctureValue`                                   |

`legbons` is a derived total. In the current processor, it includes curse,
cleanse, last heal, glare, holy touch, very critical hit, and anguish counts.
Value-only defensive bonuses such as facade, critical shield, and puncture are
kept in their value fields.

## Combo, Movement, Outcome, And System Keys

| Key         | Processor behavior                                                      |
| ----------- | ----------------------------------------------------------------------- |
| `combo`     | recognized as combo metadata                                            |
| `combo-max` | updates `warriorMechanics.maxCombo`                                     |
| `step`      | actor movement step, increments `steps`                                 |
| `+swing`    | movement/tempo metadata                                                 |
| `winner`    | sets battle outcome winner name                                         |
| `loser`     | sets battle outcome loser name and marks the matching warrior dead      |
| `flee`      | marks actor fled and battle has flee                                    |
| `+ph`       | sets PH for the player character, sign corrected after outcome is known |
| `txt`       | system text row, used for lost turns and surrender                      |
| `shout`     | system text/voice metadata                                              |

## Observed But Not Fully Aggregated

These keys are known from sampled logs or current coverage sets, but they should
be read as modifiers or metadata unless a future processor change explicitly
maps them into a stable warrior metric:

| Key family              | Examples                                                                                | Current status                                            |
| ----------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| reduction percentages   | `-redacdmg_per`, `-redabdest_per`, `-poison_lowdmg_per`                                 | visible in timeline/action coverage, not fully aggregated |
| offensive flags         | `+of_crit`, `+of_wound`                                                                 | visible marker metadata                                   |
| slow/crit modifiers     | `+critslow_per`, `+critsa_per`                                                          | recognized as control/buff metadata depending key         |
| active/aura modifiers   | `active_decblock_per`, `active_absorbdest_per`, `aura-sa_per`, `aura-adddmg2_per-meele` | recognized metadata                                       |
| damage modifiers        | `alllowdmg`, `lowheal_per-enemies`, `healall_per`, `achpp_per`                          | recognized category metadata                              |
| unsupported future keys | any unknown action                                                                      | surfaced in `actionCoverage.unknown`                      |

Unknown keys should not be silently ignored in audits. The processor returns
`actionCoverage` so UI/dev tools can show which actions are known, unknown, and
how often they appeared.

## Worked Walkthrough

Use this excerpt:

```txt
617=100.00;23476=100.00;+dmg=7639;+dmgo=5534;-redacdmg_per=-30;+acdmg=171;-dmg=0
23476=100.00;617=100.00;tspell=Szarża;skillId=130
23476=100.00;617=96.85;+dmg=9338;-redacdmg_per=-27;+acdmg=148;-legbon_facade=13;-dmg=2814
617=100.00;0;heal=2814
617=100.00;23476=99.67;+of_crit;+critslow_per=10;+dmg=6648;+dmgo=10558;+acdmg=171;-blok=1994;-legbon_facade=13;-dmg=0;-dmgo=383
23476=100.00;0;heal=383
23476=100.00;617=100.00;tspell=Paraliżujący cios;skillId=110
23476=100.00;617=100.00;+dmg=8592;-evade;+wound;-dmg=0
617=100.00;23476=99.75;+crit;+critslow_per=10;+dmg=10073;+dmgo=5886;+thirdatt=6890;+acdmg=171;-endest=15;-dmg=288
23476=100.00;0;heal=288
23476=100.00;617=100.00;tspell=Błyskawiczny atak;skillId=204
23476=100.00;617=95.58;+dmg=10725;+legbon_curse;+acdmg=148;-endest=12,3;+wound;-dmg=3947
617=98.87;0;heal=2942
617=95.72;0;wound=2817,20
0;0;txt=Demodras - utrata tury
23476=100.00;617=95.72;tspell=Agresywny atak;skillId=203
23476=100.00;617=89.85;+dmg=12255;+acdmg=148;-legbon_cleanse;-dmg=5245
617=92.97;0;heal=2787
```

### Opening attack row

```txt
617=100.00;23476=100.00;+dmg=7639;+dmgo=5534;-redacdmg_per=-30;+acdmg=171;-dmg=0
```

- actor: `617`, target: `23476`;
- actor HP and target HP are still `100%`;
- `+dmg=7639` increases actor melee damage;
- `+dmgo=5534` increases actor auxiliary damage;
- `-redacdmg_per=-30` is reduction metadata;
- `+acdmg=171` increases actor armor-reduction total;
- `-dmg=0` means final physical post-defense damage was zero.

### Skill declaration row

```txt
23476=100.00;617=100.00;tspell=Szarża;skillId=130
```

- actor `23476` used skill name `Szarża`;
- stable identity is `skillId=130`;
- spell usage is counted for `23476`;
- this row can affect how subsequent follow-up damage rows are counted.

### Damage with facade

```txt
23476=100.00;617=96.85;+dmg=9338;-redacdmg_per=-27;+acdmg=148;-legbon_facade=13;-dmg=2814
```

- actor `23476` attempts `9338` physical/melee damage;
- target `617` drops to `96.85%`;
- `-legbon_facade=13` records target facade value;
- final post-defense damage is `2814`, so target damage taken increases by
  `2814`.

### Heal row

```txt
617=100.00;0;heal=2814
```

- actor `617` receives/produces a passive heal tick;
- no direct target exists (`0`);
- `passiveHealing` increases by `2814`.

### Critical-like row with block and auxiliary taken damage

```txt
617=100.00;23476=99.67;+of_crit;+critslow_per=10;+dmg=6648;+dmgo=10558;+acdmg=171;-blok=1994;-legbon_facade=13;-dmg=0;-dmgo=383
```

- `+of_crit` and `+critslow_per=10` are visible modifier metadata;
- actor damage families get `+dmg=6648` and `+dmgo=10558`;
- target blocked `1994`, so target `blocks` and `blockedDamage` increase;
- final physical damage is `0`, but final auxiliary damage is `383`;
- target facade value is recorded as `13`.

### Evasion row

```txt
23476=100.00;617=100.00;+dmg=8592;-evade;+wound;-dmg=0
```

- `23476` attempts damage;
- target `617` evades, so target `evasions` and actor `attacksEvaded`
  increase;
- `+wound` marks wound application;
- final post-defense damage is `0`.

### Resource pressure row

```txt
617=100.00;23476=99.75;+crit;+critslow_per=10;+dmg=10073;+dmgo=5886;+thirdatt=6890;+acdmg=171;-endest=15;-dmg=288
```

- `+crit` increments actor critical hits;
- `+thirdatt=6890` increments third attack damage;
- `-endest=15` destroys target energy and adds energy pressure for the actor;
- final post-defense physical damage is `288`.

### Legendary curse and energy destruction

```txt
23476=100.00;617=95.58;+dmg=10725;+legbon_curse;+acdmg=148;-endest=12,3;+wound;-dmg=3947
```

- actor `23476` triggers curse (`legbonCurse`);
- `-endest=12,3` uses `12` as numeric value and keeps `12,3` raw;
- target `617` takes `3947` final physical damage.

### Passive wound tick

```txt
617=95.72;0;wound=2817,20
```

- affected warrior `617` takes wound damage;
- `woundDamageTaken` and total `damageTaken` increase by `2817`.

### Lost turn system row

```txt
0;0;txt=Demodras - utrata tury
```

- no direct actor or target;
- processor finds warrior by name and increments `turns` and `turnsLost`;
- timeline marks this as a notable control/lost-turn event.

### Cleanse row

```txt
23476=100.00;617=89.85;+dmg=12255;+acdmg=148;-legbon_cleanse;-dmg=5245
```

- actor attempts `12255` physical/melee damage;
- target `617` triggers cleanse;
- final post-defense damage is `5245`.

## Maintenance Checklist

When adding support for a new action key:

1. Add it to the appropriate category set or damage map in
   `packages/battle-processor/src/index.ts`.
2. Decide whether it should affect warrior aggregates, timeline deltas,
   `warriorMechanics`, or only `actionCoverage`.
3. Add or update processor tests with one minimal row for that key.
4. Update this document with the key, target/actor semantics, and aggregation
   behavior.
5. If the UI renders the key, add/verify i18n labels in the web app.
