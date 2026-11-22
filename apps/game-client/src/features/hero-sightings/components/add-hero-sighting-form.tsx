import { cn } from "cn";
import { formatLevel } from "@lootlog/domain/profession";
import { WindowFooter } from "@/components/draggable-window/window-footer";
import { FormFieldError } from "@/components/form-field-error";
import { AutocompleteSuggestions } from "@/components/ui/autocomplete-suggestions";
import { Button } from "@/components/ui/button";
import { formFieldLabelClassName } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MAX_HERO_LEVEL,
  MIN_HERO_LEVEL,
  useAddHeroSightingForm,
  type AddHeroSightingFormProps,
} from "@/features/hero-sightings/hooks/use-add-hero-sighting-form";
import type { KnownHero } from "@lootlog/domain/hero-sightings";

const hintClassName = "ll:text-[11px] ll:text-gray-400";

export function AddHeroSightingForm(props: AddHeroSightingFormProps) {
  const {
    t,
    isPending,
    targets,
    targetsStatus,
    register,
    errors,
    suggestedHeroes,
    suggestions,
    fillHero,
    handleNamePaste,
    handleNameKeyDown,
    handleSubmit,
    onSubmit,
  } = useAddHeroSightingForm(props);

  const nameField = register("name");

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="ll:flex ll:min-h-0 ll:w-full ll:flex-1 ll:flex-col"
    >
      <ScrollArea className="ll:min-h-0 ll:w-full ll:flex-1">
        <div className="ll:flex ll:w-full ll:flex-col ll:gap-2 ll:px-3 ll:py-2">
          <div className="ll:relative ll:w-full">
            <Label htmlFor="heroName" className={formFieldLabelClassName}>
              {t("addForm.nameLabel")}
            </Label>
            <Input
              id="heroName"
              autoComplete="off"
              autoFocus
              placeholder={t("addForm.namePlaceholder")}
              aria-describedby="heroNameHint"
              {...nameField}
              onChange={(event) => {
                void nameField.onChange(event);
                suggestions.open();
              }}
              onBlur={(event) => {
                void nameField.onBlur(event);
                suggestions.closeAfterBlur();
              }}
              onPaste={handleNamePaste}
              onKeyDown={handleNameKeyDown}
            />
            <AutocompleteSuggestions<KnownHero>
              items={suggestedHeroes}
              isOpen={suggestions.isOpen}
              onSelect={fillHero}
              selectedIndex={suggestions.selectedIndex}
              keyExtractor={(hero) => hero.key}
              renderItem={(hero, _index, isSelected) => (
                <div
                  className={cn(
                    "ll:border-b ll:border-x-0 ll:border-t-0 ll:border-gray-600/50 ll:px-2 ll:py-1.5 ll:text-xs last:ll:border-b-0",
                    isSelected ? "ll:bg-blue-500/30" : "ll:hover:bg-white/5",
                  )}
                >
                  <span className="ll:font-semibold ll:text-white">
                    {hero.name}
                  </span>
                  <span className="ll:ml-1 ll:text-gray-400">
                    ({formatLevel(hero.lvl, hero.prof)})
                  </span>
                </div>
              )}
            />
            <FormFieldError message={errors.name?.message} />
            <p id="heroNameHint" className={cn(hintClassName, "ll:mt-1")}>
              {t("addForm.pasteHint")}
            </p>
          </div>

          <div className="ll:w-full">
            <Label htmlFor="heroLvl" className={formFieldLabelClassName}>
              {t("addForm.lvlLabel")}
            </Label>
            <Input
              id="heroLvl"
              type="number"
              min={MIN_HERO_LEVEL}
              max={MAX_HERO_LEVEL}
              step={1}
              autoComplete="off"
              inputMode="numeric"
              placeholder={t("addForm.lvlPlaceholder")}
              {...register("lvl")}
            />
            <FormFieldError message={errors.lvl?.message} />
          </div>

          <div className="ll:w-full">
            <Label htmlFor="heroMapName" className={formFieldLabelClassName}>
              {t("addForm.mapLabel")}
            </Label>
            <Input
              id="heroMapName"
              autoComplete="off"
              placeholder={t("addForm.mapPlaceholder")}
              {...register("mapName")}
            />
            <FormFieldError message={errors.mapName?.message} />
          </div>

          <p className={hintClassName} role="status">
            {targetsStatus === "ready"
              ? t("addForm.targets", {
                  names: targets
                    .map((target) => target.name ?? target.guildId)
                    .join(", "),
                })
              : t(`addForm.noTargets.${targetsStatus}`)}
          </p>
        </div>
      </ScrollArea>

      <WindowFooter rowClassName="ll:justify-end ll:gap-1 ll:px-3">
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={props.onClose}
          disabled={isPending}
        >
          {t("actions.cancel", { ns: "common" })}
        </Button>
        <Button
          type="submit"
          size="xs"
          variant="secondary"
          loading={isPending}
          disabled={targets.length === 0}
        >
          {t("addForm.submit")}
        </Button>
      </WindowFooter>
    </form>
  );
}
