import { useState } from "react";
import { Button } from "@lootlog/ui";
import { Play, FileJson } from "lucide-react";
import { gameEventsManager } from "@/lib/game-events-manager";
import { EVENT_TEMPLATES, type EventTemplate } from "../utils/event-templates";
import type { GameEvent } from "@/types/margonem/game-events/game-event";

export const EventInjector = () => {
  const [selectedTemplate, setSelectedTemplate] =
    useState<EventTemplate | null>(null);
  const [customJson, setCustomJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"template" | "custom">("template");

  const handleTriggerTemplate = (template: EventTemplate) => {
    setError(null);
    try {
      gameEventsManager.queueEvent(template.event);
      console.log(
        `[DevTools] Triggered event: ${template.name}`,
        template.event,
      );
    } catch (err) {
      setError(`Failed to trigger event: ${err}`);
    }
  };

  const handleTriggerCustom = () => {
    setError(null);
    try {
      const event = JSON.parse(customJson) as GameEvent;
      gameEventsManager.queueEvent(event);
      console.log("[DevTools] Triggered custom event:", event);
    } catch (err) {
      setError(`Invalid JSON: ${err}`);
    }
  };

  const handleLoadTemplate = (template: EventTemplate) => {
    setSelectedTemplate(template);
    setCustomJson(JSON.stringify(template.event, null, 2));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === "template" ? "default" : "outline"}
          onClick={() => setMode("template")}
        >
          Templates
        </Button>
        <Button
          size="sm"
          variant={mode === "custom" ? "default" : "outline"}
          onClick={() => setMode("custom")}
        >
          Custom JSON
        </Button>
      </div>

      {mode === "template" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="border border-border rounded p-3 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {template.description}
                    </div>
                  </div>
                  <span className="text-xs bg-accent px-2 py-1 rounded">
                    {template.category}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleTriggerTemplate(template)}
                    className="flex-1"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Trigger
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLoadTemplate(template)}
                  >
                    <FileJson className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "custom" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Event JSON</label>
            <textarea
              className="w-full h-64 p-3 bg-muted border border-border rounded font-mono text-xs"
              value={customJson}
              onChange={(e) => setCustomJson(e.target.value)}
              placeholder="Paste GameEvent JSON here..."
            />
          </div>
          <Button onClick={handleTriggerCustom}>
            <Play className="h-4 w-4 mr-2" />
            Trigger Custom Event
          </Button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

      <div className="p-3 bg-muted rounded">
        <div className="text-xs text-muted-foreground">
          <strong>Note:</strong> Events triggered here will be processed by your
          event handlers as if they came from the game. Check the Event Logger
          to see the triggered events.
        </div>
      </div>
    </div>
  );
};
