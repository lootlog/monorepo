import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Schema } from "effect";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useTranslation } from "react-i18next";
import { AddHeroSightingDtoState } from "@lootlog/client/main";
import { getApiErrorStringField } from "@lootlog/client/transport";
import {
  collectKnownHeroes,
  getHeroSightingKey,
  parseHeroDetectorMessage,
  suggestKnownHeroes,
  type KnownHero,
} from "@lootlog/domain/hero-sightings";
import { getShortnameByProf } from "@lootlog/domain/profession";
import { useAddHeroSighting } from "@/features/hero-sightings/hooks/use-add-hero-sighting";
import { useAddHeroSightingTargets } from "@/features/hero-sightings/hooks/use-add-hero-sighting-targets";
import { useLoadedHeroSightings } from "@/hooks/api/use-hero-sightings";
import { useLoadedTimers } from "@/hooks/api/use-timers";
import { useSuggestionList } from "@/hooks/ui/use-suggestion-list";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";

const MAX_HERO_NAME_LENGTH = 100;

export const MIN_HERO_LEVEL = 1;

export const MAX_HERO_LEVEL = 500;

const MAX_HERO_MAP_NAME_LENGTH = 200;

const FormSchema = Schema.Struct({
  name: Schema.String,
  lvl: Schema.String,
  mapName: Schema.String,
});

type FormValues = typeof FormSchema.Type;

type FormTranslation = (
  key:
    | "addForm.validation.nameRequired"
    | "addForm.validation.nameMax"
    | "addForm.validation.lvlRange"
    | "addForm.validation.mapRequired"
    | "addForm.validation.mapMax",
  options?: { min?: number; max?: number },
) => string;

const validateForm = (
  data: FormValues,
  t: FormTranslation,
): Schema.FilterIssue[] => {
  const issues: Schema.FilterIssue[] = [];
  const name = data.name.trim();
  const mapName = data.mapName.trim();
  const level = Number(data.lvl);

  if (name.length === 0) {
    issues.push({
      path: ["name"],
      issue: t("addForm.validation.nameRequired"),
    });
  } else if (name.length > MAX_HERO_NAME_LENGTH) {
    issues.push({
      path: ["name"],
      issue: t("addForm.validation.nameMax", { max: MAX_HERO_NAME_LENGTH }),
    });
  }

  if (
    data.lvl.trim() === "" ||
    !Number.isInteger(level) ||
    level < MIN_HERO_LEVEL ||
    level > MAX_HERO_LEVEL
  ) {
    issues.push({
      path: ["lvl"],
      issue: t("addForm.validation.lvlRange", {
        min: MIN_HERO_LEVEL,
        max: MAX_HERO_LEVEL,
      }),
    });
  }

  if (mapName.length === 0) {
    issues.push({
      path: ["mapName"],
      issue: t("addForm.validation.mapRequired"),
    });
  } else if (mapName.length > MAX_HERO_MAP_NAME_LENGTH) {
    issues.push({
      path: ["mapName"],
      issue: t("addForm.validation.mapMax", { max: MAX_HERO_MAP_NAME_LENGTH }),
    });
  }

  return issues;
};

const createFormResolver = (t: FormTranslation) =>
  standardSchemaResolver(
    Schema.toStandardSchemaV1(
      FormSchema.check(Schema.makeFilter((data) => validateForm(data, t))),
    ),
  );

export type AddHeroSightingFormProps = {
  world: string;
  onClose: () => void;
};

export function useAddHeroSightingForm({
  world,
  onClose,
}: AddHeroSightingFormProps) {
  const { t } = useTranslation("heroSightings");
  const { mutate: addHeroSighting, isPending } = useAddHeroSighting();
  const { targets, status: targetsStatus } = useAddHeroSightingTargets();

  const knownHeroRef = useRef<
    | (Pick<KnownHero, "key" | "prof"> & { state?: AddHeroSightingDtoState })
    | null
  >(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: createFormResolver(t),
    defaultValues: {
      name: "",
      lvl: "",
      mapName: "",
    },
  });

  const typedName = useWatch({ control, name: "name" });

  const knownHeroes = collectKnownHeroes(
    useLoadedHeroSightings([world]),
    useLoadedTimers(world) ?? [],
  );

  const suggestedHeroes = suggestKnownHeroes(knownHeroes, typedName);
  const suggestions = useSuggestionList(suggestedHeroes);

  const fillHero = (hero: Omit<KnownHero, "key">) => {
    const options = { shouldValidate: true };
    setValue("name", hero.name, options);
    setValue("lvl", String(hero.lvl), options);
    knownHeroRef.current = {
      key: getHeroSightingKey(hero.name),
      prof: hero.prof,
    };
    suggestions.close();
  };

  const handleNamePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const detection = parseHeroDetectorMessage(
      event.clipboardData.getData("text"),
    );

    if (!detection) return;
    event.preventDefault();
    fillHero({
      name: detection.heroName,
      lvl: detection.heroLvl,
      prof: detection.heroProf
        ? getShortnameByProf(detection.heroProf)
        : undefined,
    });

    if (knownHeroRef.current) knownHeroRef.current.state = detection.state;

    setValue("mapName", detection.mapName, { shouldValidate: true });
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) =>
    suggestions.handleKeyDown(event, fillHero);

  const onSubmit = (data: FormValues) => {
    if (targets.length === 0) return;
    const name = data.name.trim();

    const knownHero =
      knownHeroRef.current?.key === getHeroSightingKey(name)
        ? knownHeroRef.current
        : null;

    const prof = knownHero?.prof;

    addHeroSighting(
      {
        guildIds: targets.map((target) => target.guildId),
        sighting: {
          world,
          hero: { name, lvl: Number(data.lvl), ...(prof && { prof }) },
          state: knownHero?.state ?? AddHeroSightingDtoState.SPAWNING,
          mapName: data.mapName.trim(),
        },
      },
      {
        onSuccess: ({ failures }) => {
          if (failures.length === 0) {
            onClose();

            return;
          }

          const isLevelHidden = failures.some(
            (failure) =>
              getApiErrorStringField(failure, "code") ===
              "HERO_SIGHTING_LEVEL_NOT_VISIBLE",
          );

          showRuntimeMessage(
            t(
              isLevelHidden
                ? "messages.addLevelNotVisible"
                : "messages.addFailed",
              { name },
            ),
          );
        },
      },
    );
  };

  return {
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
  };
}
