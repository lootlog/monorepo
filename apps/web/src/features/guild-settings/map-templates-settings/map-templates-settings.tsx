import { useState, useMemo } from "react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { FileText, Plus, X, MapPin, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import {
  useMapTemplates,
  type MapTemplate,
  type MapItem,
} from "./hooks/use-map-templates";
import {
  useCreateMapTemplate,
  useDeleteMapTemplate,
} from "./hooks/use-map-template-mutations";
import { useGameMaps, type GameMap } from "@/hooks/api/use-game-maps";

const MapTemplatesHeader = ({
  onAddClick,
  showForm,
}: {
  onAddClick: () => void;
  showForm: boolean;
}) => (
  <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="p-2 rounded-lg bg-primary/10">
        <FileText className="size-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold leading-tight">Szablony map</h2>
        <p className="text-xs text-muted-foreground leading-tight">
          Zarządzaj szablonami list mapek
        </p>
      </div>
    </div>
    <Button size="sm" onClick={onAddClick}>
      <Plus className="w-4 h-4 mr-2" />
      {showForm ? "Anuluj" : "Nowy szablon"}
    </Button>
  </div>
);

export const MapTemplatesSettings = () => {
  const { data: templates, isLoading } = useMapTemplates();
  const { data: gameMaps } = useGameMaps();
  const createTemplate = useCreateMapTemplate();
  const deleteTemplate = useDeleteMapTemplate();

  const [showForm, setShowForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter game maps based on search query and exclude already added maps
  const filteredGameMaps = useMemo(() => {
    if (!gameMaps) return [];
    const addedMapIds = new Set(maps.map((m) => m.id));
    return gameMaps
      .filter(
        (map) =>
          !addedMapIds.has(map.id) &&
          (map.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            map.id.toString().includes(searchQuery)),
      )
      .slice(0, 50); // Limit to 50 results for performance
  }, [gameMaps, maps, searchQuery]);

  const handleToggleMap = (gameMap: GameMap, checked: boolean) => {
    if (checked) {
      setMaps([...maps, { id: gameMap.id, name: gameMap.name }]);
    } else {
      setMaps(maps.filter((m) => m.id !== gameMap.id));
    }
  };

  const handleRemoveMap = (mapId: number) => {
    setMaps(maps.filter((m) => m.id !== mapId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateName.trim()) {
      toast.error("Nazwa szablonu jest wymagana");
      return;
    }

    if (maps.length === 0) {
      toast.error("Dodaj przynajmniej jedną mapę");
      return;
    }

    try {
      await createTemplate.mutateAsync({
        name: templateName.trim(),
        maps,
      });
      toast.success("Szablon utworzony pomyślnie");
      setTemplateName("");
      setMaps([]);
      setSearchQuery("");
      setShowForm(false);
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error("Szablon o tej nazwie już istnieje");
      } else {
        toast.error("Błąd podczas tworzenia szablonu");
      }
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate.mutateAsync(templateId);
      toast.success("Szablon usunięty");
    } catch (error) {
      toast.error("Błąd podczas usuwania szablonu");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <MapTemplatesHeader
        onAddClick={() => setShowForm(!showForm)}
        showForm={showForm}
      />
      <ScrollArea className="flex-1 min-h-0 bg-background/50">
        <div className="p-3 flex flex-col gap-4">
          {showForm && (
            <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Nazwa szablonu</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="np. Mrozy"
                  />
                </div>

                {/* Selected maps */}
                <div className="space-y-3">
                  <Label>
                    Wybrane mapy{" "}
                    {maps.length > 0 && (
                      <span className="text-muted-foreground">
                        ({maps.length})
                      </span>
                    )}
                  </Label>

                  {maps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {maps.map((map) => (
                        <div
                          key={map.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20"
                        >
                          <MapPin className="w-3 h-3 text-primary" />
                          <span className="text-sm font-medium text-primary">
                            {map.name}
                          </span>
                          <span className="text-xs text-primary/70">
                            ({map.id})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMap(map.id)}
                            className="hover:text-destructive ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Map search and selection */}
                <div className="space-y-3">
                  <Label>Wyszukaj i dodaj mapy</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Szukaj po nazwie lub ID mapy..."
                      className="pl-9"
                    />
                  </div>

                  {/* Map list with checkboxes */}
                  <div className="border rounded-lg max-h-[250px] overflow-y-auto">
                    {filteredGameMaps.length > 0 ? (
                      <div className="divide-y">
                        {filteredGameMaps.map((gameMap) => (
                          <label
                            key={gameMap.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={maps.some((m) => m.id === gameMap.id)}
                              onCheckedChange={(checked) =>
                                handleToggleMap(gameMap, checked === true)
                              }
                            />
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="flex-1 text-sm">
                              {gameMap.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ID: {gameMap.id}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nie znaleziono map pasujących do "{searchQuery}"
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Wpisz nazwę lub ID mapy, aby wyszukać
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={createTemplate.isPending}
                  className="w-full"
                >
                  {createTemplate.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Zapisz szablon
                </Button>
              </form>
            </Card>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : templates?.length === 0 ? (
            <Card className="flex flex-col items-center justify-center h-64 gap-4 bg-card/40 backdrop-blur-sm">
              <FileText className="w-16 h-16 text-muted-foreground" />
              <p className="text-muted-foreground">Brak szablonów</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {templates?.map((template: MapTemplate) => (
                <Card
                  key={template.id}
                  className="p-4 bg-card/40 backdrop-blur-sm border-border"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {template.maps.length} map
                      </p>
                    </div>
                    <ConfirmDeleteDialog
                      onConfirm={() => handleDelete(template.id)}
                      title="Usunąć szablon?"
                      description={`Czy na pewno chcesz usunąć szablon ${template.name}?`}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {template.maps.map((map, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                      >
                        <MapPin className="w-3 h-3" />
                        {map.name}
                        <span className="text-muted-foreground">
                          ({map.id})
                        </span>
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
