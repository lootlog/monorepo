import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import {
  Clock,
  Users,
  Map as MapIcon,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  ChevronDown,
  Settings,
  Timer,
} from "lucide-react";
import {
  useEventMutations,
  type TimeOfDayMultiplier,
} from "../../hooks/mutations/use-event-mutations";
import { toast } from "sonner";

interface EventEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    guildId: string;
    name: string;
    active: boolean;
    createdAt: string;
    startsAt?: string;
    endsAt?: string;
    timeOfDayMultipliers?: TimeOfDayMultiplier[];
    trackersMultipliers?: Record<string, number>;
    mapsCountMultipliers?: Record<string, number>;
    trackingDurationMultipliers?: Record<string, number>;
    assignmentTimeoutMinutes?: number;
    mapAssignmentCap?: number;
    basePointsPerKill?: number;
  };
}

interface FormData {
  name: string;
  startsAt: string;
  endsAt: string;
  assignmentTimeoutMinutes: number;
  mapAssignmentCap: number;
  basePointsPerKill: number;
}

export const EventEditDialog = ({
  open,
  onOpenChange,
  event,
}: EventEditDialogProps) => {
  const { t } = useTranslation();
  const { updateEvent } = useEventMutations(event.guildId, event.id);

  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      name: event.name,
      startsAt: event.startsAt
        ? new Date(event.startsAt).toISOString().slice(0, 16)
        : new Date(event.createdAt).toISOString().slice(0, 16),
      endsAt: event.endsAt
        ? new Date(event.endsAt).toISOString().slice(0, 16)
        : "",
      assignmentTimeoutMinutes: event.assignmentTimeoutMinutes ?? 5,
      mapAssignmentCap: event.mapAssignmentCap ?? 0,
      basePointsPerKill: event.basePointsPerKill ?? 1,
    },
  });

  const [timeMultipliers, setTimeMultipliers] = useState<TimeOfDayMultiplier[]>(
    event.timeOfDayMultipliers ?? [],
  );
  const [trackersMultipliers, setTrackersMultipliers] = useState<
    { count: number; multiplier: number }[]
  >(
    event.trackersMultipliers
      ? Object.entries(event.trackersMultipliers).map(
          ([count, multiplier]) => ({
            count: Number(count),
            multiplier,
          }),
        )
      : [],
  );
  const [mapsMultipliers, setMapsMultipliers] = useState<
    { count: number; multiplier: number }[]
  >(
    event.mapsCountMultipliers
      ? Object.entries(event.mapsCountMultipliers).map(
          ([count, multiplier]) => ({
            count: Number(count),
            multiplier,
          }),
        )
      : [],
  );
  const [trackingDurationMultipliers, setTrackingDurationMultipliers] =
    useState<{ percentage: number; multiplier: number }[]>(
      event.trackingDurationMultipliers
        ? Object.entries(event.trackingDurationMultipliers).map(
            ([percentage, multiplier]) => ({
              percentage: Number(percentage),
              multiplier,
            }),
          )
        : [],
    );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      reset({
        name: event.name,
        startsAt: event.startsAt
          ? new Date(event.startsAt).toISOString().slice(0, 16)
          : new Date(event.createdAt).toISOString().slice(0, 16),
        endsAt: event.endsAt
          ? new Date(event.endsAt).toISOString().slice(0, 16)
          : "",
        assignmentTimeoutMinutes: event.assignmentTimeoutMinutes ?? 5,
        mapAssignmentCap: event.mapAssignmentCap ?? 0,
        basePointsPerKill: event.basePointsPerKill ?? 1,
      });
      setTimeMultipliers(event.timeOfDayMultipliers ?? []);
      setTrackersMultipliers(
        event.trackersMultipliers
          ? Object.entries(event.trackersMultipliers).map(
              ([count, multiplier]) => ({
                count: Number(count),
                multiplier,
              }),
            )
          : [],
      );
      setMapsMultipliers(
        event.mapsCountMultipliers
          ? Object.entries(event.mapsCountMultipliers).map(
              ([count, multiplier]) => ({
                count: Number(count),
                multiplier,
              }),
            )
          : [],
      );
      setTrackingDurationMultipliers(
        event.trackingDurationMultipliers
          ? Object.entries(event.trackingDurationMultipliers).map(
              ([percentage, multiplier]) => ({
                percentage: Number(percentage),
                multiplier,
              }),
            )
          : [],
      );
    }
  }, [open, event, reset]);

  const handleAddTimeMultiplier = () => {
    setTimeMultipliers([
      ...timeMultipliers,
      { from: "00:00", to: "06:00", multiplier: 1.5 },
    ]);
  };

  const handleRemoveTimeMultiplier = (index: number) => {
    setTimeMultipliers(timeMultipliers.filter((_, i) => i !== index));
  };

  const handleTimeMultiplierChange = (
    index: number,
    field: keyof TimeOfDayMultiplier,
    value: string | number,
  ) => {
    setTimeMultipliers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddTrackersMultiplier = () => {
    const nextCount =
      trackersMultipliers.length > 0
        ? Math.max(...trackersMultipliers.map((b) => b.count)) + 1
        : 1;
    setTrackersMultipliers([
      ...trackersMultipliers,
      { count: nextCount, multiplier: 1.0 },
    ]);
  };

  const handleRemoveTrackersMultiplier = (index: number) => {
    setTrackersMultipliers(trackersMultipliers.filter((_, i) => i !== index));
  };

  const handleTrackersMultiplierChange = (
    index: number,
    field: "count" | "multiplier",
    value: number,
  ) => {
    setTrackersMultipliers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddMapsMultiplier = () => {
    const nextCount =
      mapsMultipliers.length > 0
        ? Math.max(...mapsMultipliers.map((m) => m.count)) + 1
        : 1;
    setMapsMultipliers([
      ...mapsMultipliers,
      { count: nextCount, multiplier: 1.0 },
    ]);
  };

  const handleRemoveMapsMultiplier = (index: number) => {
    setMapsMultipliers(mapsMultipliers.filter((_, i) => i !== index));
  };

  const handleMapsMultiplierChange = (
    index: number,
    field: "count" | "multiplier",
    value: number,
  ) => {
    setMapsMultipliers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddTrackingDurationMultiplier = () => {
    const isFirst = trackingDurationMultipliers.length === 0;
    if (isFirst) {
      // Add default config: <50% = 0.5x, >=50% = 1.0x
      setTrackingDurationMultipliers([
        { percentage: 0, multiplier: 0.5 },
        { percentage: 50, multiplier: 1.0 },
      ]);
    } else {
      const nextPercentage = Math.min(
        100,
        Math.max(...trackingDurationMultipliers.map((m) => m.percentage)) + 25,
      );
      setTrackingDurationMultipliers([
        ...trackingDurationMultipliers,
        { percentage: nextPercentage, multiplier: 1.0 },
      ]);
    }
  };

  const handleRemoveTrackingDurationMultiplier = (index: number) => {
    setTrackingDurationMultipliers(
      trackingDurationMultipliers.filter((_, i) => i !== index),
    );
  };

  const handleTrackingDurationMultiplierChange = (
    index: number,
    field: "percentage" | "multiplier",
    value: number,
  ) => {
    // Clamp percentage to 0-100
    const clampedValue =
      field === "percentage" ? Math.min(100, Math.max(0, value)) : value;
    setTrackingDurationMultipliers((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: clampedValue } : item,
      ),
    );
  };

  const onSubmit = async (data: FormData) => {
    try {
      const trackersRecord: Record<number, number> = {};
      trackersMultipliers.forEach(({ count, multiplier }) => {
        trackersRecord[count] = multiplier;
      });

      const mapsRecord: Record<number, number> = {};
      mapsMultipliers.forEach(({ count, multiplier }) => {
        mapsRecord[count] = multiplier;
      });

      const trackingDurationRecord: Record<number, number> = {};
      trackingDurationMultipliers.forEach(({ percentage, multiplier }) => {
        trackingDurationRecord[percentage] = multiplier;
      });

      await updateEvent.mutateAsync({
        name: data.name,
        startsAt: data.startsAt
          ? new Date(data.startsAt).toISOString()
          : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : undefined,
        timeOfDayMultipliers:
          timeMultipliers.length > 0 ? timeMultipliers : null,
        trackersMultipliers:
          Object.keys(trackersRecord).length > 0 ? trackersRecord : null,
        mapsCountMultipliers:
          Object.keys(mapsRecord).length > 0 ? mapsRecord : null,
        trackingDurationMultipliers:
          Object.keys(trackingDurationRecord).length > 0
            ? trackingDurationRecord
            : null,
        assignmentTimeoutMinutes: data.assignmentTimeoutMinutes,
        mapAssignmentCap: data.mapAssignmentCap,
        basePointsPerKill: data.basePointsPerKill,
      });
      toast.success(t("events.scoring.saveSuccess"));
      onOpenChange(false);
    } catch {
      toast.error(t("events.scoring.saveError"));
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Pencil className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.edit")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {event.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <form
            id="event-edit-form"
            onSubmit={handleSubmit(onSubmit)}
            className="p-5 space-y-5"
          >
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.createDialog.nameLabel")}
              </Label>
              <Input
                {...register("name", { required: true })}
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("events.createDialog.startsAt", "Data rozpoczęcia")}
                </Label>
                <Input
                  type="datetime-local"
                  {...register("startsAt")}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("events.createDialog.endsAt", "Data zakończenia")}
                </Label>
                <Input
                  type="datetime-local"
                  {...register("endsAt")}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t(
                  "events.settings.assignmentTimeout",
                  "Czas na przypisanie (minuty)",
                )}
              </Label>
              <Input
                type="number"
                min={0}
                {...register("assignmentTimeoutMinutes", {
                  valueAsNumber: true,
                })}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  "events.settings.assignmentTimeoutDescription",
                  "Ile minut przed minimalnym czasem respawnu można się przypisać do mapy",
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.settings.mapAssignmentCap", "Limit osób na mapie")}
              </Label>
              <Input
                type="number"
                min={0}
                {...register("mapAssignmentCap", { valueAsNumber: true })}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  "events.settings.mapAssignmentCapDescription",
                  "Maksymalna liczba osób, które mogą się przypisać do jednej mapy (0 = brak limitu)",
                )}
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Settings className="size-3" />
                {t("events.scoring.title")}
              </Label>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("events.scoring.basePoints", "Bazowe punkty za killa")}
                </Label>
                <Input
                  type="number"
                  min={1}
                  {...register("basePointsPerKill", { valueAsNumber: true })}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t(
                    "events.scoring.basePointsDescription",
                    "Punkty bazowe przed mnożnikami (zmiana przeliczy wszystkie historyczne kille)",
                  )}
                </p>
              </div>

              <Collapsible
                open={openSections.timeOfDay}
                onOpenChange={() => toggleSection("timeOfDay")}
              >
                <div className="rounded-lg border bg-muted/20 overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-blue-400" />
                      <span className="text-sm font-medium">
                        {t("events.scoring.timeOfDay.title")}
                      </span>
                      {timeMultipliers.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({timeMultipliers.length})
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform ${
                        openSections.timeOfDay ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t("events.scoring.timeOfDay.description")}
                      </p>
                      {timeMultipliers.map((tm, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border"
                        >
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {t("events.scoring.timeOfDay.from")}
                              </Label>
                              <Input
                                type="time"
                                value={tm.from}
                                onChange={(e) =>
                                  handleTimeMultiplierChange(
                                    index,
                                    "from",
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {t("events.scoring.timeOfDay.to")}
                              </Label>
                              <Input
                                type="time"
                                value={tm.to}
                                onChange={(e) =>
                                  handleTimeMultiplierChange(
                                    index,
                                    "to",
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {t("events.scoring.timeOfDay.multiplier")}
                              </Label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={tm.multiplier}
                                onChange={(e) =>
                                  handleTimeMultiplierChange(
                                    index,
                                    "multiplier",
                                    parseFloat(e.target.value) || 1,
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTimeMultiplier(index)}
                            className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      {timeMultipliers.length === 0 && (
                        <div className="py-3 px-4 rounded-lg border border-dashed text-center">
                          <p className="text-xs text-muted-foreground">
                            {t("events.scoring.timeOfDay.empty")}
                          </p>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddTimeMultiplier}
                        className="w-full h-8 text-xs"
                      >
                        <Plus className="size-3 mr-1" />
                        {t("events.scoring.timeOfDay.add")}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Collapsible
                open={openSections.trackers}
                onOpenChange={() => toggleSection("trackers")}
              >
                <div className="rounded-lg border bg-muted/20 overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-green-400" />
                      <span className="text-sm font-medium">
                        {t("events.scoring.trackers.title")}
                      </span>
                      {trackersMultipliers.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({trackersMultipliers.length})
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform ${
                        openSections.trackers ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t("events.scoring.trackers.description")}
                      </p>
                      {trackersMultipliers
                        .sort((a, b) => a.count - b.count)
                        .map((bm, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border"
                          >
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {t("events.scoring.trackers.count")}
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={bm.count}
                                  onChange={(e) =>
                                    handleTrackersMultiplierChange(
                                      index,
                                      "count",
                                      parseInt(e.target.value) || 1,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {t("events.scoring.trackers.multiplier")}
                                </Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  value={bm.multiplier}
                                  onChange={(e) =>
                                    handleTrackersMultiplierChange(
                                      index,
                                      "multiplier",
                                      parseFloat(e.target.value) || 1,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveTrackersMultiplier(index)
                              }
                              className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      {trackersMultipliers.length === 0 && (
                        <div className="py-3 px-4 rounded-lg border border-dashed text-center">
                          <p className="text-xs text-muted-foreground">
                            {t("events.scoring.trackers.empty")}
                          </p>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddTrackersMultiplier}
                        className="w-full h-8 text-xs"
                      >
                        <Plus className="size-3 mr-1" />
                        {t("events.scoring.trackers.add")}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Collapsible
                open={openSections.mapsCount}
                onOpenChange={() => toggleSection("mapsCount")}
              >
                <div className="rounded-lg border bg-muted/20 overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <MapIcon className="size-4 text-yellow-400" />
                      <span className="text-sm font-medium">
                        {t("events.scoring.mapsCount.title")}
                      </span>
                      {mapsMultipliers.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({mapsMultipliers.length})
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform ${
                        openSections.mapsCount ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t("events.scoring.mapsCount.description")}
                      </p>
                      {mapsMultipliers
                        .sort((a, b) => a.count - b.count)
                        .map((mm, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border"
                          >
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {t("events.scoring.mapsCount.count")}
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={mm.count}
                                  onChange={(e) =>
                                    handleMapsMultiplierChange(
                                      index,
                                      "count",
                                      parseInt(e.target.value) || 1,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {t("events.scoring.mapsCount.multiplier")}
                                </Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  value={mm.multiplier}
                                  onChange={(e) =>
                                    handleMapsMultiplierChange(
                                      index,
                                      "multiplier",
                                      parseFloat(e.target.value) || 1,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMapsMultiplier(index)}
                              className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      {mapsMultipliers.length === 0 && (
                        <div className="py-3 px-4 rounded-lg border border-dashed text-center">
                          <p className="text-xs text-muted-foreground">
                            {t("events.scoring.mapsCount.empty")}
                          </p>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddMapsMultiplier}
                        className="w-full h-8 text-xs"
                      >
                        <Plus className="size-3 mr-1" />
                        {t("events.scoring.mapsCount.add")}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Tracking Duration Multipliers */}
              <Collapsible
                open={openSections.trackingDuration}
                onOpenChange={() => toggleSection("trackingDuration")}
              >
                <div className="rounded-lg border bg-muted/20 overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Timer className="size-4 text-cyan-400" />
                      <span className="text-sm font-medium">
                        {t("events.scoring.trackingDuration.title")}
                      </span>
                      {trackingDurationMultipliers.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({trackingDurationMultipliers.length})
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform ${
                        openSections.trackingDuration ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t("events.scoring.trackingDuration.description")}
                      </p>
                      {trackingDurationMultipliers
                        .sort((a, b) => a.percentage - b.percentage)
                        .map((tdm, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border"
                          >
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {t("events.scoring.trackingDuration.percentage")}
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={tdm.percentage}
                                  onChange={(e) =>
                                    handleTrackingDurationMultiplierChange(
                                      index,
                                      "percentage",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {t("events.scoring.trackingDuration.multiplier")}
                                </Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={tdm.multiplier}
                                  onChange={(e) =>
                                    handleTrackingDurationMultiplierChange(
                                      index,
                                      "multiplier",
                                      Number.parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveTrackingDurationMultiplier(index)
                              }
                              className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      {trackingDurationMultipliers.length === 0 && (
                        <div className="py-3 px-4 rounded-lg border border-dashed text-center">
                          <p className="text-xs text-muted-foreground">
                            {t("events.scoring.trackingDuration.empty")}
                          </p>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddTrackingDurationMultiplier}
                        className="w-full h-8 text-xs"
                      >
                        <Plus className="size-3 mr-1" />
                        {t("events.scoring.trackingDuration.add")}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          </form>
        </div>

        <div className="px-5 py-3 border-t bg-muted/30 shrink-0 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t("events.createDialog.cancel")}
          </Button>
          <Button
            type="submit"
            form="event-edit-form"
            size="sm"
            disabled={updateEvent.isPending}
            className="flex-1"
          >
            {updateEvent.isPending ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                {t("events.scoring.saving")}
              </>
            ) : (
              <>
                <Pencil className="size-3.5 mr-1.5" />
                {t("events.scoring.save")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
