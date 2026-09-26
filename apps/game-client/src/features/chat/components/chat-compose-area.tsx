import { ChatInput } from "./chat-input";
import type { ReactNode } from "react";

export function ChatComposeArea({
  guildId,
  ownGathering,
}: {
  guildId: string;
  ownGathering: ReactNode;
}) {
  return (
    <div className="ll:shrink-0">
      {ownGathering}
      <ChatInput variant="borderless" selectedGuildId={guildId || undefined} />
    </div>
  );
}
