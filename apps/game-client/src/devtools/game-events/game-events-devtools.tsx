import { useState } from "react";
import { Bug } from "lucide-react";
import { DevToolsPanel } from "./components/devtools-panel";

export const GameEventsDevTools = () => {
  const [isOpen, setIsOpen] = useState(false);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <>
      {!isOpen && (
        <button
          className="fixed bottom-4 right-4 bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
          style={{ zIndex: 9998 }}
          onClick={() => setIsOpen(true)}
          title="Open Game Events DevTools"
        >
          <Bug className="h-5 w-5" />
        </button>
      )}

      {isOpen && <DevToolsPanel onClose={() => setIsOpen(false)} />}
    </>
  );
};
