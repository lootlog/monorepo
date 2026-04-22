import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GuildMultiSelector } from "@/components/guild-multi-selector";
import { getCreatePartyGatheringErrorMessage } from "@/features/party-finder/get-create-party-gathering-error-message";
import { usePartyGatheringOrchestration } from "@/features/party-finder/hooks/use-party-gathering-orchestration";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Game } from "@/lib/game";

const createFormSchema = (
  t: (key: string, options?: Record<string, unknown>) => string,
) =>
  z
    .object({
      description: z.string().max(200).optional(),
      minLvl: z.coerce.number().min(1).max(500).optional().or(z.literal("")),
      maxLvl: z.coerce.number().min(1).max(500).optional().or(z.literal("")),
    })
    .refine(
      (data) => {
        if (data.minLvl && data.maxLvl) {
          return Number(data.minLvl) <= Number(data.maxLvl);
        }
        return true;
      },
      {
        message: t("form.validation.minGreaterThanMax"),
        path: ["minLvl"],
      },
    );

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export const CreatePartyGatheringForm = () => {
  const { t } = useTranslation("partyFinder");
  const [selectedGuildIds, setSelectedGuildIds] = useState<string[]>([]);
  const { isCreatingPartyGathering, startPartyGathering } =
    usePartyGatheringOrchestration();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(createFormSchema(t)) as never,
    defaultValues: {
      description: "",
      minLvl: "",
      maxLvl: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (selectedGuildIds.length === 0) {
      window.message(t("form.selectGuild"));
      return;
    }

    const world = Game.getWorldName();

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
      window.message(getCreatePartyGatheringErrorMessage(error));
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
        <label className="ll:text-[11px] ll:text-gray-300 ll:mb-1 ll:block">
          {t("form.descriptionLabel")}
        </label>
        <Input
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
          <label className="ll:text-[11px] ll:text-gray-300 ll:mb-1 ll:block">
            {t("form.minLvlLabel")}
          </label>
          <Input
            {...register("minLvl")}
            type="number"
            min={1}
            max={500}
            placeholder="1"
          />
        </div>
        <div className="ll:flex-1">
          <label className="ll:text-[11px] ll:text-gray-300 ll:mb-1 ll:block">
            {t("form.maxLvlLabel")}
          </label>
          <Input
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
        type="submit"
        disabled={isCreatingPartyGathering}
        className="ll:mt-2"
      >
        {isCreatingPartyGathering ? t("form.submitting") : t("form.submit")}
      </Button>
    </form>
  );
};
