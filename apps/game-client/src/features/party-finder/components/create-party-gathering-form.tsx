import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formFieldLabelClassName } from "@/components/ui/form-field";
import { FormFieldError } from "@/components/form-field-error";
import { WindowFooter } from "@/components/draggable-window/window-footer";
import { GuildTargetPicker } from "@/components/guild-target-picker";
import { useGuildTargets } from "@/hooks/use-guild-targets";
import { getCreatePartyGatheringErrorMessage } from "@/features/party-finder/get-create-party-gathering-error-message";
import { usePartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Schema } from "effect";
import { useGameStore } from "@/store/game.store";

const MIN_PARTY_LEVEL = 1;

const MAX_PARTY_LEVEL = 500;

const MAX_DESCRIPTION_LENGTH = 200;

/** An empty level input stays `""`; anything else must be a level in range. */
const LevelInput = Schema.Union([
  Schema.Literal(""),
  Schema.FiniteFromString.check(
    Schema.isBetween({ minimum: MIN_PARTY_LEVEL, maximum: MAX_PARTY_LEVEL }),
  ),
]);

const FormSchema = Schema.Struct({
  description: Schema.optional(
    Schema.String.check(Schema.isMaxLength(MAX_DESCRIPTION_LENGTH)),
  ),
  minLvl: Schema.optional(LevelInput),
  maxLvl: Schema.optional(LevelInput),
});

const createFormResolver = (t: TFunction<"partyFinder">) =>
  standardSchemaResolver(
    Schema.toStandardSchemaV1(
      FormSchema.check(
        Schema.makeFilter(({ minLvl, maxLvl }) =>
          !minLvl || !maxLvl || minLvl <= maxLvl
            ? undefined
            : {
                path: ["minLvl"],
                issue: t("form.validation.minGreaterThanMax"),
              },
        ),
      ),
    ),
  );

type FormData = typeof FormSchema.Type;

export const CreatePartyGatheringForm = () => {
  const formId = useId();
  const { t } = useTranslation("partyFinder");
  const [selectedGuildIds, setSelectedGuildIds] = useState<string[]>([]);
  const targetGuildIds = useGuildTargets(selectedGuildIds);

  const { isCreatingPartyGathering, startPartyGathering } =
    usePartyGatheringOrchestration();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<typeof FormSchema.Encoded, undefined, FormData>({
    resolver: createFormResolver(t),
    defaultValues: {
      description: "",
      minLvl: "",
      maxLvl: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (targetGuildIds.length === 0) {
      toast.error(t("form.selectGuild"));

      return;
    }

    const world = useGameStore.getState().game?.world ?? "unknown";

    try {
      await startPartyGathering({
        guildIds: targetGuildIds,
        world,
        description: data.description || undefined,
        minLvl: data.minLvl ? Number(data.minLvl) : undefined,
        maxLvl: data.maxLvl ? Number(data.maxLvl) : undefined,
        closeCreateWindow: true,
      });
      reset();
    } catch (error) {
      toast.error(getCreatePartyGatheringErrorMessage(error));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="ll:flex ll:h-full ll:w-full ll:flex-col"
    >
      <ScrollArea className="ll:min-h-0 ll:w-full ll:flex-1">
        <div className="ll:flex ll:w-full ll:flex-col ll:gap-2 ll:px-3 ll:py-2">
          <GuildTargetPicker
            value={targetGuildIds}
            onChange={setSelectedGuildIds}
            className="ll:w-full"
          />

          <div className="ll:w-full">
            <Label
              htmlFor={`${formId}-description`}
              className={formFieldLabelClassName}
            >
              {t("form.descriptionLabel")}
            </Label>
            <Input
              id={`${formId}-description`}
              {...register("description")}
              placeholder={t("form.descriptionPlaceholder")}
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <FormFieldError message={errors.description?.message} />
          </div>

          <div className="ll:grid ll:w-full ll:grid-cols-2 ll:gap-2">
            <div className="ll:min-w-0">
              <Label
                htmlFor={`${formId}-minLvl`}
                className={formFieldLabelClassName}
              >
                {t("form.minLvlLabel")}
              </Label>
              <Input
                id={`${formId}-minLvl`}
                {...register("minLvl")}
                type="number"
                min={MIN_PARTY_LEVEL}
                max={MAX_PARTY_LEVEL}
                placeholder={String(MIN_PARTY_LEVEL)}
              />
              <FormFieldError message={errors.minLvl?.message} />
            </div>
            <div className="ll:min-w-0">
              <Label
                htmlFor={`${formId}-maxLvl`}
                className={formFieldLabelClassName}
              >
                {t("form.maxLvlLabel")}
              </Label>
              <Input
                id={`${formId}-maxLvl`}
                {...register("maxLvl")}
                type="number"
                min={MIN_PARTY_LEVEL}
                max={MAX_PARTY_LEVEL}
                placeholder={String(MAX_PARTY_LEVEL)}
              />
              <FormFieldError message={errors.maxLvl?.message} />
            </div>
          </div>
        </div>
      </ScrollArea>

      <WindowFooter rowClassName="ll:justify-end ll:gap-1 ll:px-3">
        <Button
          variant="secondary"
          size="xs"
          type="submit"
          loading={isCreatingPartyGathering}
        >
          {t("form.submit")}
        </Button>
      </WindowFooter>
    </form>
  );
};
