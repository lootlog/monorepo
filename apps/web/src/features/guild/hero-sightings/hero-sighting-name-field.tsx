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
  suggestionsLabel: string;
  onChange: (name: string) => void;
  onPickHero: (hero: KnownHero) => void;
  onPasteDetection: (detection: HeroDetection) => void;
};

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
