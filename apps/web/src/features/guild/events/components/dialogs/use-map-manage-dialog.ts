import { filterAvailableGameMaps } from "@/utils/filter-available-game-maps";
import {
  useEventsAssignmentControllerAddMap,
  useEventsAssignmentControllerAssignMapToLocation,
  useEventsAssignmentControllerCreateLocation,
  useEventsAssignmentControllerDeleteLocation,
  useEventsAssignmentControllerDeleteMap,
  useEventsAssignmentControllerReorderLocations,
  useEventsAssignmentControllerUpdateLocation,
  useMapTemplatesControllerGetTemplates,
  useMapsControllerGetMaps,
  type GameMapResponseDtoOutput,
  type MapTemplateResponseDto,
} from "@lootlog/client/main";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { useQueryClient } from "@tanstack/react-query";
import { sortBy } from "es-toolkit";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { invalidateEventMapStructureQueries } from "../../hooks/mutations/invalidate-event-queries";
import type { LocationData } from "./map-manage-dialog.types";

interface MapData {
  id: string;
  mapId: number;
  mapName: string;
  locationId?: string | null;
}

export interface MapManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  eventId: string;
  hero: {
    id: string;
    npcName: string;
    locations?: LocationData[];
    maps: MapData[];
  };
}

const getHeroLocations = (hero: MapManageDialogProps["hero"]) =>
  hero.locations ?? [];

export function useMapManageDialog({
  guildId,
  eventId,
  hero,
}: MapManageDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const invalidateMapQueries = () => {
    return invalidateEventMapStructureQueries(queryClient, guildId, eventId);
  };

  const addMap = useEventsAssignmentControllerAddMap({
    mutation: {
      onSuccess: invalidateMapQueries,
    },
  });

  const deleteMap = useEventsAssignmentControllerDeleteMap({
    mutation: {
      onSuccess: invalidateMapQueries,
    },
  });

  const createLocation = useEventsAssignmentControllerCreateLocation({
    mutation: {
      onSuccess: invalidateMapQueries,
    },
  });

  const updateLocation = useEventsAssignmentControllerUpdateLocation({
    mutation: {
      onSuccess: invalidateMapQueries,
    },
  });

  const deleteLocation = useEventsAssignmentControllerDeleteLocation({
    mutation: {
      onSuccess: invalidateMapQueries,
    },
  });

  const reorderLocations = useEventsAssignmentControllerReorderLocations({
    mutation: {
      onSuccess: invalidateMapQueries,
    },
  });

  const assignMapToLocation = useEventsAssignmentControllerAssignMapToLocation({
    mutation: {
      onSuccess: invalidateMapQueries,
    },
  });

  const { data: gameMaps } = useMapsControllerGetMaps();

  const { data: templates } = useMapTemplatesControllerGetTemplates({
    guildId,
  });

  const [pendingTemplate, setPendingTemplate] = useState<{
    templateId: string;
    locationId: string | null;
  } | null>(null);

  const [isAddingMap, setIsAddingMap] = useState(false);
  const isAdding = isAddingMap || pendingTemplate !== null;
  const [searchQuery, setSearchQuery] = useState("");
  const [newLocationName, setNewLocationName] = useState("");

  const [editingLocation, setEditingLocation] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );

  const heroLocations = getHeroLocations(hero);

  const [reorderedLocationIds, setReorderedLocationIds] = useState<
    string[] | null
  >(null);

  const handleReorder = (newOrder: LocationData[]) => {
    if (reorderLocations.isPending) return;
    setReorderedLocationIds(newOrder.map((location) => location.id));
  };

  const handleDragEnd = () => {
    if (!reorderedLocationIds || reorderLocations.isPending) return;
    reorderLocations.mutate(
      {
        pathParams: {
          guildId,
          eventId,
          heroId: hero.id,
        },
        data: { locationIds: reorderedLocationIds },
      },
      {
        onError: () => {
          toast.error(t("events.locations.errors.updateFailed"));
        },
        onSettled: () => setReorderedLocationIds(null),
      },
    );
  };

  const locationOrder = new Map(
    reorderedLocationIds?.map((id, index) => [id, index]),
  );

  const displayedLocations = reorderedLocationIds
    ? sortBy(heroLocations, [
        (location) => locationOrder.get(location.id) ?? locationOrder.size,
      ])
    : heroLocations;

  const allMapsFromLocations = heroLocations.flatMap(
    (location) => location.maps,
  );

  const allMaps = [...allMapsFromLocations, ...hero.maps];

  const addedMapIds = new Set(allMaps.map((map) => map.mapId));

  const filteredGameMaps = gameMaps
    ? filterAvailableGameMaps(gameMaps, addedMapIds, searchQuery)
    : [];

  const handleAddMapFromGame = async (gameMap: GameMapResponseDtoOutput) => {
    if (isAdding) return;
    setIsAddingMap(true);
    await addMap
      .mutateAsync({
        pathParams: { guildId, eventId, heroId: hero.id },
        data: { mapId: gameMap.id, mapName: gameMap.name },
      })
      .then(async (result) => {
        if (selectedLocationId) {
          await assignMapToLocation.mutateAsync({
            pathParams: { guildId, eventId, heroId: hero.id, mapId: result.id },
            data: { locationId: selectedLocationId },
          });
        }
      })
      .catch((cause: unknown) => {
        if (getApiErrorStatus(cause) === 400) {
          toast.error(t("events.maps.errors.duplicate"));
        } else {
          toast.error(t("events.maps.errors.addFailed"));
        }
      })
      .finally(() => setIsAddingMap(false));
  };

  const handleDeleteMap = async (mapId: string) => {
    try {
      await deleteMap.mutateAsync({
        pathParams: {
          guildId,
          eventId,
          heroId: hero.id,
          mapId,
        },
      });
    } catch {
      toast.error(t("events.maps.errors.deleteFailed"));
    }
  };

  const handleLoadTemplate = async (
    template: MapTemplateResponseDto,
    targetLocationId: string | null,
  ) => {
    if (isAdding) return;
    const mapsToAdd = template.maps.filter((m) => !addedMapIds.has(m.id));

    if (mapsToAdd.length === 0) {
      toast.info(t("events.maps.allTemplatesAdded"));

      return;
    }

    setPendingTemplate({
      templateId: template.id,
      locationId: targetLocationId,
    });

    const results = await Promise.allSettled(
      mapsToAdd.map(async (mapItem) => {
        const result = await addMap.mutateAsync({
          pathParams: {
            guildId,
            eventId,
            heroId: hero.id,
          },
          data: { mapId: mapItem.id, mapName: mapItem.name },
        });

        if (targetLocationId) {
          await assignMapToLocation.mutateAsync({
            pathParams: {
              guildId,
              eventId,
              heroId: hero.id,
              mapId: result.id,
            },
            data: { locationId: targetLocationId },
          });
        }

        return result;
      }),
    );

    setPendingTemplate(null);

    if (results.some((result) => result.status === "rejected")) {
      toast.error(t("events.maps.errors.addFailed"));
    }

    const addedCount = results.filter((r) => r.status === "fulfilled").length;

    if (addedCount > 0) {
      toast.success(
        t("events.maps.templateLoaded", {
          count: addedCount,
          name: template.name,
        }),
      );
    }
  };

  const handleCreateLocation = async () => {
    if (!newLocationName.trim()) return;

    try {
      await createLocation.mutateAsync({
        pathParams: {
          guildId,
          eventId,
          heroId: hero.id,
        },
        data: { name: newLocationName.trim() },
      });
      setNewLocationName("");
      toast.success(t("events.locations.createSuccess"));
    } catch (cause) {
      if (getApiErrorStatus(cause) === 400) {
        toast.error(t("events.locations.errors.duplicateName"));
      } else {
        toast.error(t("events.locations.errors.createFailed"));
      }
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation || !editingLocation.name.trim()) return;

    try {
      await updateLocation.mutateAsync({
        pathParams: {
          guildId,
          eventId,
          heroId: hero.id,
          locationId: editingLocation.id,
        },
        data: { name: editingLocation.name.trim() },
      });
      setEditingLocation(null);
      toast.success(t("events.locations.updateSuccess"));
    } catch (cause) {
      if (getApiErrorStatus(cause) === 400) {
        toast.error(t("events.locations.errors.duplicateName"));
      } else {
        toast.error(t("events.locations.errors.updateFailed"));
      }
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      await deleteLocation.mutateAsync({
        pathParams: {
          guildId,
          eventId,
          heroId: hero.id,
          locationId,
        },
      });
      toast.success(t("events.locations.deleteSuccess"));
    } catch {
      toast.error(t("events.locations.errors.deleteFailed"));
    }
  };

  const handleMapLocationChange = async (
    mapId: string,
    newLocationId: string | null,
  ) => {
    try {
      await assignMapToLocation.mutateAsync({
        pathParams: {
          guildId,
          eventId,
          heroId: hero.id,
          mapId,
        },
        data: { locationId: newLocationId },
      });
    } catch {
      toast.error(t("events.locations.errors.assignFailed"));
    }
  };

  return {
    t,
    newLocationName,
    setNewLocationName,
    handleCreateLocation,
    createLocation,
    displayedLocations,
    handleReorder,
    editingLocation,
    setEditingLocation,
    handleUpdateLocation,
    handleDeleteLocation,
    deleteLocation,
    isReordering: reorderLocations.isPending,
    handleDragEnd,
    heroLocations,
    handleDeleteMap,
    handleMapLocationChange,
    deleteMap,
    templates,
    isAdding,
    pendingTemplate,
    handleLoadTemplate,
    selectedLocationId,
    setSelectedLocationId,
    searchQuery,
    setSearchQuery,
    filteredGameMaps,
    handleAddMapFromGame,
  };
}
