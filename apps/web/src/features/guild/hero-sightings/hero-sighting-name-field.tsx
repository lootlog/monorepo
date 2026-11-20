import {
  parseHeroDetectorMessage,
  suggestKnownHeroes,
  type HeroDetection,
  type KnownHero,
} from "@lootlog/domain/hero-sightings";
import { formatLevel } from "@lootlog/domain/profession";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@lootlog/ui/components/combobox";
import type { ComponentProps } from "react";

type HeroSightingNameFieldProps = Pick<
  ComponentProps<typeof ComboboxInput>,
  "id" | "aria-describedby" | "aria-invalid" | "placeholder" | "onBlur"
> & {
  value: string;
  knownHeroes: readonly KnownHero[];
  /** Names the list of suggestions. */
  suggestionsLabel: string;
  onChange: (name: string) => void;
  onPickHero: (hero: KnownHero) => void;
  /** The game's detector line was pasted: it names the hero, state and map. */
  onPasteDetection: (detection: HeroDetection) => void;
};

/**
 * The hero's name, typed freely. Heroes the Organization already met are
 * suggested, and the detector's chat line can be pasted whole.
 */
export const HeroSightingNameField = ({
  value,
  knownHeroes,
  suggestionsLabel,
  onChange,
  onPickHero,
  onPasteDetection,
  ...inputProps
}: HeroSightingNameFieldProps) => {
  const suggestions = suggestKnownHeroes(knownHeroes, value);

  return (
    <Combobox
      items={suggestions}
      filteredItems={suggestions}
      value={null}
      inputValue={value}
      itemToStringLabel={(hero: KnownHero) => hero.name}
      onInputValueChange={(nextValue, details) => {
        if (details.reason === "input-change") onChange(nextValue);
      }}
      onValueChange={(hero) => {
        if (hero) onPickHero(hero);
      }}
    >
      <ComboboxInput
        {...inputProps}
        showTrigger={false}
        autoComplete="off"
        maxLength={100}
        className="w-full"
        onPaste={(event) => {
          const detection = parseHeroDetectorMessage(
            event.clipboardData.getData("text"),
          );

          if (!detection) return;
          event.preventDefault();
          onPasteDetection(detection);
        }}
      />
      {suggestions.length > 0 && (
        <ComboboxContent>
          <ComboboxList aria-label={suggestionsLabel}>
            {suggestions.map((hero) => (
              <ComboboxItem key={hero.key} value={hero}>
                <span className="min-w-0 truncate">{hero.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatLevel(hero.lvl, hero.prof)}
                </span>
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      )}
    </Combobox>
  );
};
