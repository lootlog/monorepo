import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Init: React.FC = () => {
  const navigate = useNavigate();
  const { data: guildData } = useGuild({
    retry: true,
  });

  useEffect(() => {
    if (guildData) {
      navigate({ to: `/${guildData.id}` });
    }
  }, [navigate, guildData]);

  return (
    <div className="h-full flex flex-col">
      <FullScreenLoading />
    </div>
  );
};
