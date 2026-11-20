import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { AddHeroSightingDtoState } from "@lootlog/client/main";
import {
  getHeroSightingKey,
  type KnownHero,
} from "@lootlog/domain/hero-sightings";
import { getShortnameByProf } from "@lootlog/domain/profession";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Schema } from "effect";
import { upperFirst } from "es-toolkit";
import type { TFunction } from "i18next";
import { Radar } from "lucide-react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { DialogActionFooter } from "@/components/common/dialog-action-footer";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { useGuildWorldScope } from "@/hooks/context/use-guild-world-scope";
import { HeroSightingNameField } from "./hero-sighting-name-field";
import { useAddHeroSighting } from "./use-add-hero-sighting";

type HeroSightingAddDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Heroes to suggest while the name is typed. */
  knownHeroes: readonly KnownHero[];
};

const MIN_LEVEL = 1;

const MAX_LEVEL = 500;

const FormSchema = Schema.Struct({
  world: Schema.String,
  name: Schema.String,
  lvl: Schema.String,
  /** Profession shortname of a picked or pasted hero; typing a name clears it. */
  prof: Schema.String,
  /**
   * Not a field: a hero added by hand is one that will spawn, because nobody
   * stops to write down a roaming hero. Only a pasted detector answer says
   * otherwise, and only while the name is still that answer's hero.
   */
  state: Schema.Enum(AddHeroSightingDtoState),
  mapName: Schema.String,
});

type FormValues = typeof FormSchema.Type;

const createResolver = (t: TFunction, asksForWorld: boolean) =>
  standardSchemaResolver(
    Schema.toStandardSchemaV1(
      FormSchema.check(
        Schema.makeFilter((values) => {
          const issues: Schema.FilterIssue[] = [];
          const level = Number(values.lvl);

          if (asksForWorld && values.world === "")
            issues.push({
              path: ["world"],
              issue: t("heroSightings.add.validation.worldRequired"),
            });

          if (values.name.trim() === "")
            issues.push({
              path: ["name"],
              issue: t("heroSightings.add.validation.heroRequired"),
            });

          if (
            values.lvl.trim() === "" ||
            !Number.isInteger(level) ||
            level < MIN_LEVEL ||
            level > MAX_LEVEL
          )
            issues.push({
              path: ["lvl"],
              issue: t("heroSightings.add.validation.levelRange", {
                min: MIN_LEVEL,
                max: MAX_LEVEL,
              }),
            });

          if (values.mapName.trim() === "")
            issues.push({
              path: ["mapName"],
              issue: t("heroSightings.add.validation.mapRequired"),
            });

          return issues;
        }),
      ),
    ),
  );

/**
 * Adds a hero sighting by hand: for a detector answer the game client did not
 * record, or a detector used without it. The board marks it as added by hand
 * until a detector answer confirms it.
 */
export const HeroSightingAddDialog = ({
  open,
  onOpenChange,
  knownHeroes,
}: HeroSightingAddDialogProps) => {
  const { t } = useTranslation();
  const formId = useId();
  const { guildId, world, worlds } = useGuildWorldScope({ enabled: open });

  // The page's world is the target; the form asks only on an all-worlds board.
  const defaultValues: FormValues = {
    world: "",
    name: "",
    lvl: "",
    prof: "",
    state: AddHeroSightingDtoState.SPAWNING,
    mapName: "",
  };

  const form = useForm<FormValues>({
    resolver: createResolver(t, world === null),
    defaultValues,
  });

  const close = () => {
    onOpenChange(false);
    form.reset(defaultValues);
  };

  const { mutate, isPending } = useAddHeroSighting(close);

  const submit = (values: FormValues) => {
    if (!guildId) return;

    // A typed name of a known hero carries that hero's profession too.
    const prof =
      values.prof ||
      knownHeroes.find((hero) => hero.key === getHeroSightingKey(values.name))
        ?.prof;

    mutate({
      pathParams: { guildId },
      data: {
        world: world ?? values.world,
        hero: {
          name: values.name.trim(),
          lvl: Number(values.lvl),
          ...(prof && { prof }),
        },
        state: values.state,
        mapName: values.mapName.trim(),
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) return;

        if (nextOpen) onOpenChange(true);
        else close();
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <IconDialogHeader
          icon={Radar}
          title={t("heroSightings.add.title")}
          description={t("heroSightings.add.description")}
        />
        <Form {...form}>
          <form id={formId} noValidate onSubmit={form.handleSubmit(submit)}>
            <div className="space-y-4 p-5">
              {world === null && (
                <FormField
                  control={form.control}
                  name="world"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("heroSightings.add.world")}</FormLabel>
                      <Select
                        value={field.value || null}
                        onValueChange={(value) => field.onChange(value ?? "")}
                        items={(worlds ?? []).map((value) => ({
                          value,
                          label: upperFirst(value),
                        }))}
                      >
                        <FormControl
                          render={
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={t(
                                  "heroSightings.add.worldPlaceholder",
                                )}
                              />
                            </SelectTrigger>
                          }
                        />
                        <SelectContent>
                          {(worlds ?? []).map((value) => (
                            <SelectItem key={value} value={value}>
                              {upperFirst(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("heroSightings.add.hero")}</FormLabel>
                      <FormControl
                        render={
                          <HeroSightingNameField
                            value={field.value}
                            knownHeroes={knownHeroes}
                            suggestionsLabel={t(
                              "heroSightings.add.knownHeroes",
                            )}
                            placeholder={t("heroSightings.add.heroPlaceholder")}
                            onBlur={field.onBlur}
                            onChange={(name) => {
                              field.onChange(name);
                              form.setValue("prof", "");
                              form.setValue("state", defaultValues.state);
                            }}
                            onPickHero={(hero) => {
                              field.onChange(hero.name);
                              form.setValue("lvl", String(hero.lvl), {
                                shouldValidate: form.formState.isSubmitted,
                              });
                              form.setValue("prof", hero.prof ?? "");
                              form.setValue("state", defaultValues.state);
                            }}
                            onPasteDetection={(detection) => {
                              form.reset(
                                {
                                  world: form.getValues("world"),
                                  name: detection.heroName,
                                  lvl: String(detection.heroLvl),
                                  prof:
                                    (detection.heroProf &&
                                      getShortnameByProf(detection.heroProf)) ||
                                    "",
                                  state: detection.state,
                                  mapName: detection.mapName,
                                },
                                { keepDefaultValues: true },
                              );
                            }}
                          />
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lvl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("heroSightings.add.level")}</FormLabel>
                      <FormControl
                        render={
                          <Input
                            {...field}
                            type="number"
                            inputMode="numeric"
                            min={MIN_LEVEL}
                            max={MAX_LEVEL}
                            step={1}
                            autoComplete="off"
                          />
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="col-span-2 -mt-1 text-sm text-muted-foreground">
                  {t("heroSightings.add.heroHint")}
                </p>
              </div>

              <FormField
                control={form.control}
                name="mapName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("heroSightings.add.map")}</FormLabel>
                    <FormControl
                      render={
                        <Input
                          {...field}
                          maxLength={200}
                          autoComplete="off"
                          placeholder={t("heroSightings.add.mapPlaceholder")}
                        />
                      }
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        <DialogActionFooter
          cancelLabel={t("common.cancel")}
          confirmForm={formId}
          confirmLabel={t("heroSightings.add.submit")}
          isPending={isPending}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
};
