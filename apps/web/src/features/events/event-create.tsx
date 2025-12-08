import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Switch } from "@lootlog/ui/components/switch";
import { useCreateEvent } from "./hooks/use-create-event";
import { Trophy, Plus, X, Swords, MapPin, FileText } from "lucide-react";
import { toast } from "sonner";
import { MapInput } from "./components/map-input";
import { useTemplates, Template } from "./hooks/use-templates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";

interface HeroNpc {
  npcId: string;
  npcName: string;
  maps: string[];
}

export const EventCreate = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { mutate: createEvent, isPending } = useCreateEvent();
  const { data: templates } = useTemplates();

  const [name, setName] = useState("");
  const [world, setWorld] = useState("");
  const [active, setActive] = useState(true);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nazwa eventu jest wymagana");
      return;
    }

    if (!world.trim()) {
      toast.error("Świat jest wymagany");
      return;
    }

    if (heroNpcs.length === 0) {
      toast.error("Dodaj przynajmniej jednego herosa");
      return;
    }

    createEvent(
      {
        name: name.trim(),
        world: world.trim(),
        active,
        heroNpcs: heroNpcs.map((h) => ({
          npcId: parseInt(h.npcId, 10),
          npcName: h.npcName,
          maps: h.maps,
        })),
      },
      {
        onSuccess: (data) => {
          toast.success("Event utworzony pomyślnie");
          navigate({ to: `/${guildId}/events/${data.id}` });
        },
        onError: () => {
          toast.error("Błąd podczas tworzenia eventu");
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10">
            <Trophy className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">
              {t("events.create")}
            </h2>
            <p className="text-xs text-muted-foreground leading-tight">
              Utwórz nowy event dla gildii
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="p-4 bg-card/40 backdrop-blur-sm border-border space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nazwa eventu</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Wielkie Polowanie"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="world">Świat</Label>
            <Input
              id="world"
              value={world}
              onChange={(e) => setWorld(e.target.value)}
              placeholder="np. tempest"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Aktywny</Label>
            <Switch id="active" checked={active} onCheckedChange={setActive} />
          </div>

          {/* Template Selector */}
          {templates && templates.length > 0 && (
            <div className="space-y-2">
              <Label>Załaduj z szablonu</Label>
              <Select
                onValueChange={(templateId) => {
                  const template = templates.find(
                    (t: Template) => t.id === templateId,
                  );
                  if (template) {
                    setHeroNpcs(
                      template.heroNpcs.map((h) => ({
                        npcId: String(h.npcId),
                        npcName: h.npcName,
                        maps: h.maps,
                      })),
                    );
                    toast.success(`Załadowano szablon: ${template.name}`);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz szablon..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: Template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {template.name} ({template.heroNpcs.length} herosów)
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </Card>

        {/* Hero NPCs */}
        <Card className="p-4 bg-card/40 backdrop-blur-sm border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              <Label>{t("events.heroes.title")}</Label>
            </div>
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

              {/* Maps for this hero */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Mapy spawnu (gdzie heros może się pojawić)
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

              <Button type="button" onClick={handleAddHero} className="w-full">
                Dodaj herosa
              </Button>
            </div>
          )}
        </Card>

        {/* Submit */}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          ) : (
            <Trophy className="w-4 h-4 mr-2" />
          )}
          {t("events.create")}
        </Button>
      </form>
    </div>
  );
};
