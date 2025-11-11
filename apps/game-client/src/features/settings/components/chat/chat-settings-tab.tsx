import { Checkbox } from "@/components/ui/checkbox";
import { useChatStore } from "@/store/chat.store";
import type { FC } from "react";

export const ChatSettingsTab: FC = () => {
  const { isIntegratedMode, toggleIntegratedMode } = useChatStore();

  return (
    <div className="ll:w-full ll:pt-2">
      <h2 className="ll:text-sm">Ustawienia chatu</h2>
      <p className="ll:text-gray-400">
        Skonfiguruj ustawienia dotyczące chatu.
      </p>
      <div className="ll:mb-4 ll:mt-4">
        <Checkbox
          value={isIntegratedMode ? "1" : "0"}
          checked={isIntegratedMode}
          onChange={toggleIntegratedMode}
          id="chat-integrated"
        >
          Włącz tryb wbudowany
        </Checkbox>
      </div>
    </div>
  );
};
