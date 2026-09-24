import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GuildMultiSelector } from "@/components/guild-multi-selector";
import { getCreatePartyGatheringErrorMessage } from "@/features/party-finder/get-create-party-gathering-error-message";
import { usePartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Schema } from "effect";
import { useGameStore } from "@/store/game.store";

/** An empty level input stays `""`; anything else must be a level in range. */
const LevelInput = Schema.Union([
  Schema.Literal(""),
  Schema.FiniteFromString.check(Schema.isBetween({ minimum: 1, maximum: 500 })),
]);

const FormSchema = Schema.Struct({
  description: Schema.optional(Schema.String.check(Schema.isMaxLength(200))),
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
    if (selectedGuildIds.length === 0) {
      toast.error(t("form.selectGuild"));

      return;
    }

    const world = useGameStore.getState().game?.world ?? "unknown";

    try {
      await startPartyGathering({
        guildIds: selectedGuildIds,
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
      className="ll:flex ll:flex-col ll:gap-2 ll:p-1"
    >
      <GuildMultiSelector
        value={selectedGuildIds}
        onChange={setSelectedGuildIds}
      />

      <div>
        <label
          htmlFor={`${formId}-description`}
          className="ll:text-[11px] ll:text-gray-300 ll:mb-1 ll:block"
        >
          {t("form.descriptionLabel")}
        </label>
        <Input
          id={`${formId}-description`}
          {...register("description")}
          placeholder={t("form.descriptionPlaceholder")}
          maxLength={200}
        />
        {errors.description && (
          <span className="ll:text-[10px] ll:text-red-400">
            {errors.description.message}
          </span>
        )}
      </div>

      <div className="ll:flex ll:gap-2">
        <div className="ll:flex-1">
          <label
            htmlFor={`${formId}-minLvl`}
            className="ll:text-[11px] ll:text-gray-300 ll:mb-1 ll:block"
          >
            {t("form.minLvlLabel")}
          </label>
          <Input
            id={`${formId}-minLvl`}
            {...register("minLvl")}
            type="number"
            min={1}
            max={500}
            placeholder="1"
          />
        </div>
        <div className="ll:flex-1">
          <label
            htmlFor={`${formId}-maxLvl`}
            className="ll:text-[11px] ll:text-gray-300 ll:mb-1 ll:block"
          >
            {t("form.maxLvlLabel")}
          </label>
          <Input
            id={`${formId}-maxLvl`}
            {...register("maxLvl")}
            type="number"
            min={1}
            max={500}
            placeholder="500"
          />
        </div>
      </div>
      {errors.minLvl && (
        <span className="ll:text-[10px] ll:text-red-400">
          {errors.minLvl.message}
        </span>
      )}

      <Button
        variant="secondary"
        size="xs"
        type="submit"
        disabled={isCreatingPartyGathering}
        className="ll:mt-2"
      >
        {isCreatingPartyGathering ? t("form.submitting") : t("form.submit")}
      </Button>
    </form>
  );
};
