import { useState } from "react";
import { Button } from "@lootlog/ui";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { EventLogger } from "./event-logger";
import { EventInjector } from "./event-injector";
import { StoreInspector } from "./store-inspector";

type Tab = "logger" | "injector" | "inspector";

interface DevToolsPanelProps {
  onClose: () => void;
}

export const DevToolsPanel = ({ onClose }: DevToolsPanelProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("logger");
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <div
      className={`fixed bottom-4 right-4 bg-background border border-border rounded-lg shadow-2xl flex flex-col transition-all ${
        isMaximized ? "w-[90vw] h-[90vh]" : "w-[600px] h-[500px]"
      }`}
      style={{ zIndex: 9999 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Game Events DevTools</span>
          <span className="text-xs text-muted-foreground">(DEV MODE)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex border-b border-border">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "logger"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("logger")}
        >
          Event Logger
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "injector"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("injector")}
        >
          Event Injector
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "inspector"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("inspector")}
        >
          Store Inspector
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === "logger" && <EventLogger />}
        {activeTab === "injector" && <EventInjector />}
        {activeTab === "inspector" && <StoreInspector />}
      </div>
    </div>
  );
};
