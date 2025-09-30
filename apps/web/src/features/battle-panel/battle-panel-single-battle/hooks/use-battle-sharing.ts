import { useEditBattle } from "@/hooks/api/battle-log/use-edit-battle";
import { BATTLELOG_PUBLIC_URL } from "@/config/addon";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "sonner";

export const useBattleSharing = () => {
  const { mutate: editBattle, isPending } = useEditBattle();
  const [, copy] = useCopyToClipboard();

  const composeBattleUrl = (battleId: string) => {
    return `${BATTLELOG_PUBLIC_URL}/battles/${battleId}`;
  };

  const handleCopy = async (url: string) => {
    try {
      await copy(url);
      toast.success("Link do walki został skopiowany do schowka!", {
        duration: 3000,
      });
    } catch (error) {
      console.warn("Failed to copy: ", error);
      toast.error("Wystąpił błąd podczas kopiowania linku.", {
        duration: 3000,
      });
    }
  };

  const handleShare = (battleId: string) => {
    editBattle(
      { battleId, data: { public: true } },
      {
        onSuccess: (response) => {
          const battleUrl = composeBattleUrl(response.data.id);
          toast.success("Walka została udostępniona!", { duration: 3000 });
          handleCopy(battleUrl);
        },
        onError: () => {
          toast.error("Wystąpił błąd podczas udostępniania walki.", {
            duration: 3000,
          });
        },
      }
    );
  };

  const handleCopyLink = (battleId: string) => {
    const battleUrl = composeBattleUrl(battleId);
    handleCopy(battleUrl);
  };

  const handleUnshare = (battleId: string) => {
    editBattle(
      { battleId, data: { public: false } },
      {
        onSuccess: () => {
          toast.success("Walka została ukryta!", { duration: 3000 });
        },
        onError: () => {
          toast.error("Wystąpił błąd podczas ukrywania walki.", {
            duration: 3000,
          });
        },
      }
    );
  };

  return {
    handleShare,
    handleCopyLink,
    handleUnshare,
    isPending,
  };
};