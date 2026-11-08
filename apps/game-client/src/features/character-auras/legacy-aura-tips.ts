import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import {
  buildLegacyOtherTip,
  getLegacyHeroTip,
  getLegacyOtherIdAt,
  getLegacyRuntimeOther,
  getLegacyTipLayer,
  isLegacyHeroAt,
  setLegacyHeroTip,
  setLegacyOtherTip,
  wrapLegacyOtherTipBuilder,
} from "@/lib/margonem-runtime/adapters/tooltip-runtime-adapter";
import { runtimeEventPipeline } from "@/lib/margonem-runtime/runtime-event-pipeline";
import { restoreLegacyShiftSections } from "@/lib/margonem-tooltips/patcher";
import { auraMark, CharacterAuraTooltip } from "./engine/tooltip";

type LegacyAuraTipsOptions = {
  /** The aura a Margonem account shows. */
  auraOf: (accountId: string) => CharacterAuraId | undefined;
  /** The hero's own aura. */
  heroAura: () => CharacterAuraId | undefined;
};

/** Which character a mouseover entered: the hero, an other by id, or neither. */
function characterAt(target: EventTarget | null): string | null {
  if (isLegacyHeroAt(target)) return "hero";

  const id = getLegacyOtherIdAt(target);

  return id === null ? null : `other:${id}`;
}

/**
 * Marks SI character tips with their aura and draws the aura round `#tip`
 * while it shows a marked character.
 *
 * Others get the mark from the wrapped `g.tips.other`, so every tip SI builds
 * carries it. The hero's tip is set inline by hero._u on every hero update,
 * so the mark goes back on after each projected `h` packet. The tip aura
 * lives only while the pointer is over a character with an aura: SI keeps
 * `#tip` and its last content in the page after fading it out.
 */
export function installLegacyAuraTips({
  auraOf,
  heroAura,
}: LegacyAuraTipsOptions) {
  let unwrap: (() => void) | null = null;
  let heroMark = "";
  let hovered: string | null = null;
  let tooltip: CharacterAuraTooltip | null = null;
  /** Others whose tip got a mark, to rebuild without it on dispose. */
  const marked = new Set<string>();

  const otherAura = (id: string) => {
    const account = getLegacyRuntimeOther(id)?.account;

    return account === undefined ? undefined : auraOf(String(account));
  };

  /** Rebuilds the tips of the given others through the wrapped builder. */
  const refreshOthers = (ids: Iterable<string>) => {
    const rebuilt: string[] = [];

    for (const id of ids) {
      const other = getLegacyRuntimeOther(id);
      const html = other ? buildLegacyOtherTip(other) : null;

      if (html === null) continue;
      setLegacyOtherTip(id, html);
      rebuilt.push(id);
    }

    // A rebuilt tip lost a Shift section the player may still hold up.
    restoreLegacyShiftSections(rebuilt);
  };

  const wrap = (): boolean => {
    unwrap ??= wrapLegacyOtherTipBuilder((other, html) => {
      const auraId = auraOf(String(other.account));

      if (!auraId) return html;
      marked.add(String(other.id));

      return html + auraMark(auraId);
    });

    return unwrap !== null;
  };

  const syncHero = () => {
    const tip = getLegacyHeroTip();

    if (tip === null) return;

    const auraId = heroAura();
    const mark = auraId ? auraMark(auraId) : "";
    const base = heroMark ? tip.replace(heroMark, "") : tip;

    heroMark = mark;

    if (base + mark !== tip) setLegacyHeroTip(base + mark);
  };

  const hideTooltip = () => {
    tooltip?.dispose();
    tooltip = null;
    hovered = null;
  };

  const onMouseOver = (event: MouseEvent) => {
    const character = characterAt(event.target);

    if (character === hovered) return;
    hideTooltip();

    const auraId =
      character === "hero"
        ? heroAura()
        : character
          ? otherAura(character.slice("other:".length))
          : undefined;

    if (!character || !auraId) return;

    hovered = character;
    const { layer, tip } = getLegacyTipLayer();
    // Tip fills `#tip` after this capture listener; the tooltip watches for it.
    tooltip = new CharacterAuraTooltip(layer, tip);
  };

  const onMouseOut = (event: MouseEvent) => {
    if (hovered && characterAt(event.relatedTarget) !== hovered) hideTooltip();
  };

  // SI defines the other tip builder with its first other.
  const unsubscribe = runtimeEventPipeline.subscribeProjected((envelope) => {
    const event = envelope.raw;

    if (event?.other && !unwrap && wrap()) {
      refreshOthers(Object.keys(event.other));
    }

    if (event?.h) syncHero();
  });

  wrap();
  syncHero();
  window.addEventListener("mouseover", onMouseOver, true);
  window.addEventListener("mouseout", onMouseOut, true);

  return {
    /** Rebuilds the tips of others whose aura changed, and the hero's. */
    refresh(otherIds: Iterable<string>): void {
      if (wrap()) refreshOthers(otherIds);
      syncHero();
    },

    dispose(): void {
      unsubscribe();
      window.removeEventListener("mouseover", onMouseOver, true);
      window.removeEventListener("mouseout", onMouseOut, true);
      hideTooltip();

      unwrap?.();
      unwrap = null;
      // Others built while wrapped keep their mark until rebuilt without it.
      refreshOthers(marked);
      marked.clear();
      const tip = getLegacyHeroTip();

      if (tip !== null && heroMark) setLegacyHeroTip(tip.replace(heroMark, ""));
      heroMark = "";
    },
  };
}
