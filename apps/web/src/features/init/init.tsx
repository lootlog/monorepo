import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { useQueryClient } from "@tanstack/react-query";

export const Init: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: guildData } = useGuild({
    retry: true,
  });

  useEffect(() => {
    if (guildData) {
      queryClient.invalidateQueries({ queryKey: ["user-guilds"] });
      navigate({ to: ROUTES.guild.base(guildData.id) });
    }
  }, [navigate, guildData, queryClient]);

  return (
    <div className="h-full flex flex-col">
      <FullScreenLoading />
    </div>
  );
};
