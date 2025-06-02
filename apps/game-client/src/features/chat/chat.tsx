import { DraggableWindow } from "@/components/draggable-window";
import { useGlobalContext } from "@/contexts/global-context";

export const Chat = () => {
  const { chatWindowOpen, setChatWindowOpen } = useGlobalContext();

  return (
    chatWindowOpen && (
      <DraggableWindow
        id="chat"
        title="Chat"
        onClose={() => setChatWindowOpen(false)}
      >
        <div className="ll-p-2">chat</div>
      </DraggableWindow>
    )
  );
};
