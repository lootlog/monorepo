import { useGuildId } from "@/hooks/context/use-guild-id";
import { filterAvailableGameMaps } from "@/utils/filter-available-game-maps";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  invalidateMapTemplatesControllerGetTemplates,
  useMapTemplatesControllerCreateTemplate,
  useMapTemplatesControllerUpdateTemplate,
  useMapsControllerGetMaps,
  type GameMapResponseDtoOutput,
  type MapTemplateResponseDto,
} from "@lootlog/client/main";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";

type MapTemplateFormProps =
  | {
      mode: "create";
      onOpenChange: (open: boolean) => void;
      template?: undefined;
    }
  | {
      mode: "edit";
      onOpenChange: (open: boolean) => void;
      template: MapTemplateResponseDto;
    };

const createFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t("settings.mapTemplates.form.nameRequired")),
    maps: z
      .array(z.object({ id: z.number(), name: z.string() }))
      .min(1, t("settings.mapTemplates.form.mapsRequired")),
  });

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export const useMapTemplateForm = ({
  mode,
  onOpenChange,
  template,
}: MapTemplateFormProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { data: gameMaps } = useMapsControllerGetMaps();
  const { mutate: createTemplate, isPending: isCreating } =
    useMapTemplatesControllerCreateTemplate({
      mutation: {
        onSuccess: async () => {
          if (!guildId) {
            return;
          }

          await invalidateMapTemplatesControllerGetTemplates(queryClient, {
            guildId,
          });
        },
      },
    });
  const { mutate: updateTemplate, isPending: isUpdating } =
    useMapTemplatesControllerUpdateTemplate({
      mutation: {
        onSuccess: async () => {
          if (!guildId) {
            return;
          }

          await invalidateMapTemplatesControllerGetTemplates(queryClient, {
            guildId,
          });
        },
      },
    });

  const isPending = mode === "create" ? isCreating : isUpdating;
  const isCreate = mode === "create";

  const [searchQuery, setSearchQuery] = useState("");

  const formSchema = createFormSchema(t);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: template?.name ?? "",
      maps: template?.maps ?? [],
    },
  });

  const maps = form.watch("maps");

  const filteredGameMaps = useMemo(() => {
    if (!gameMaps) return [];
    const addedMapIds = new Set(maps.map((m) => m.id));
    return filterAvailableGameMaps(gameMaps, addedMapIds, searchQuery);
  }, [gameMaps, maps, searchQuery]);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setSearchQuery("");
    }
    onOpenChange(isOpen);
  };

  const handleToggleMap = (
    gameMap: GameMapResponseDtoOutput,
    checked: boolean,
  ) => {
    const currentMaps = form.getValues("maps");
    if (checked) {
      form.setValue("maps", [
        ...currentMaps,
        { id: gameMap.id, name: gameMap.name },
      ]);
    } else {
      form.setValue(
        "maps",
        currentMaps.filter((m) => m.id !== gameMap.id),
      );
    }
  };

  const handleRemoveMap = (mapId: number) => {
    const currentMaps = form.getValues("maps");
    form.setValue(
      "maps",
      currentMaps.filter((m) => m.id !== mapId),
    );
  };

  const onSubmit = (data: FormData) => {
    const payload = { name: data.name.trim(), maps: data.maps };
    const errorHandler = (cause: unknown) => {
      if (getApiErrorStatus(cause) === 400) {
        toast.error(t("settings.mapTemplates.toasts.duplicateName"));
      } else {
        toast.error(
          t(
            isCreate
              ? "settings.mapTemplates.toasts.createError"
              : "settings.mapTemplates.toasts.updateError",
          ),
        );
      }
    };

    if (!guildId) {
      return;
    }

    if (isCreate) {
      createTemplate(
        {
          pathParams: { guildId },
          data: payload,
        },
        {
          onSuccess: () => {
            toast.success(t("settings.mapTemplates.toasts.created"));
            handleClose(false);
          },
          onError: errorHandler,
        },
      );
    } else {
      updateTemplate(
        {
          pathParams: { guildId, templateId: template.id },
          data: payload,
        },
        {
          onSuccess: () => {
            toast.success(t("settings.mapTemplates.toasts.updated"));
            handleClose(false);
          },
          onError: errorHandler,
        },
      );
    }
  };

  const Icon = isCreate ? FileText : Pencil;
  const dialogKey = isCreate ? "createDialog" : "editDialog";

  return {
    Icon,
    t,
    dialogKey,
    form,
    onSubmit,
    maps,
    handleRemoveMap,
    searchQuery,
    setSearchQuery,
    filteredGameMaps,
    handleToggleMap,
    handleClose,
    isPending,
  };
};
