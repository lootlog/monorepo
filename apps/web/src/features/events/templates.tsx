import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  FileText,
  Plus,
  X,
  Swords,
  MapPin,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useTemplates, Template } from "./hooks/use-templates";
import {
  useCreateTemplate,
  useDeleteTemplate,
} from "./hooks/use-template-mutations";
import { MapInput } from "./components/map-input";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";

interface HeroNpc {
  npcId: string;
  npcName: string;
  maps: string[];
}

export const Templates = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ strict: false });
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [showForm, setShowForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [heroNpcs, setHeroNpcs] = useState<HeroNpc[]>([]);
  const [showHeroForm, setShowHeroForm] = useState(false);
  const [newHero, setNewHero] = useState<HeroNpc>({
    npcId: "",
    npcName: "",
    maps: [],
  });
  const [newMapForHero, setNewMapForHero] = useState("");

  const handleAddMapToHero = () => {
    if (newMapForHero.trim()) {
      setNewHero({ ...newHero, maps: [...newHero.maps, newMapForHero.trim()] });
      setNewMapForHero("");
    }
  };

  const handleRemoveMapFromHero = (index: number) => {
    setNewHero({
      ...newHero,
      maps: newHero.maps.filter((_, i) => i !== index),
    });
  };

  const handleAddHero = () => {
    if (newHero.npcId && newHero.npcName && newHero.maps.length > 0) {
      setHeroNpcs([...heroNpcs, newHero]);
      setNewHero({ npcId: "", npcName: "", maps: [] });
      setShowHeroForm(false);
    } else {
      toast.error("Wypełnij wszystkie pola i dodaj przynajmniej jedną mapę");
    }
  };

  const handleRemoveHero = (index: number) => {
    setHeroNpcs(heroNpcs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateName.trim()) {
      toast.error("Nazwa szablonu jest wymagana");
      return;
    }

    if (heroNpcs.length === 0) {
      toast.error("Dodaj przynajmniej jednego herosa");
      return;
    }

    try {
      await createTemplate.mutateAsync({
        name: templateName.trim(),
        heroNpcs: heroNpcs.map((h) => ({
          npcId: parseInt(h.npcId, 10),
          npcName: h.npcName,
          maps: h.maps,
        })),
      });
      toast.success("Szablon utworzony pomyślnie");
      setTemplateName("");
      setHeroNpcs([]);
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
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link to="/$guildId/events" params={{ guildId: guildId ?? "" }}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">
              {t("events.templates.title", "Szablony map")}
            </h2>
            <p className="text-xs text-muted-foreground leading-tight">
              {t(
                "events.templates.description",
                "Zarządzaj szablonami herosów i map",
              )}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("events.templates.create", "Nowy szablon")}
        </Button>
      </div>

      <div className="px-3 flex flex-col gap-4">
        {/* Create Form */}
        {showForm && (
          <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">
                  {t("events.templates.name", "Nazwa szablonu")}
                </Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="np. Imladris Standard"
                />
              </div>

              {/* Hero NPCs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("events.heroes.title", "Herosi")}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHeroForm(!showHeroForm)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Dodaj herosa
                  </Button>
                </div>

                {heroNpcs.map((hero, index) => (
                  <div
                    key={index}
                    className="p-3 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{hero.npcName}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {hero.npcId}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveHero(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hero.maps.map((map, mapIdx) => (
                        <span
                          key={mapIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded"
                        >
                          <MapPin className="w-3 h-3" />
                          {map}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {showHeroForm && (
                  <div className="space-y-3 p-3 border rounded-lg">
                    <Input
                      value={newHero.npcId}
                      onChange={(e) =>
                        setNewHero({ ...newHero, npcId: e.target.value })
                      }
                      placeholder="ID NPC"
                    />
                    <Input
                      value={newHero.npcName}
                      onChange={(e) =>
                        setNewHero({ ...newHero, npcName: e.target.value })
                      }
                      placeholder="Nazwa NPC"
                    />

                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Mapy spawnu
                      </Label>
                      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                        {newHero.maps.map((map, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded"
                          >
                            {map}
                            <button
                              type="button"
                              onClick={() => handleRemoveMapFromHero(idx)}
                              className="hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapInput
                          value={newMapForHero}
                          onChange={setNewMapForHero}
                          placeholder="Nazwa mapy"
                          className="flex-1"
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            (e.preventDefault(), handleAddMapToHero())
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddMapToHero}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddHero}
                      className="w-full"
                    >
                      Dodaj herosa
                    </Button>
                  </div>
                )}
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
                {t("events.templates.save", "Zapisz szablon")}
              </Button>
            </form>
          </Card>
        )}

        {/* Templates List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : templates?.length === 0 ? (
          <Card className="flex flex-col items-center justify-center h-64 gap-4 bg-card/40 backdrop-blur-sm">
            <FileText className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t("events.templates.empty", "Brak szablonów")}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {templates?.map((template: Template) => (
              <Card
                key={template.id}
                className="p-4 bg-card/40 backdrop-blur-sm border-border"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.heroNpcs.length} herosów
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

                <div className="space-y-2">
                  {template.heroNpcs.map((hero, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-muted/30 rounded-lg border border-border/50"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Swords className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium text-sm">
                          {hero.npcName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          (ID: {hero.npcId})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {hero.maps.map((map, mapIdx) => (
                          <span
                            key={mapIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded"
                          >
                            <MapPin className="w-3 h-3" />
                            {map}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
