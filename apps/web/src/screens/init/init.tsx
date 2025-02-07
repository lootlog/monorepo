import { FullScreenLoading } from "components/ui/full-screen-loading";
import { useGuild } from "hooks/api/use-guild";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const Init: React.FC = () => {
  const navigate = useNavigate();
  const { data: guildData } = useGuild({
    retry: true,
  });

  useEffect(() => {
    if (guildData) {
      navigate(`/${guildData.id}`);
    }
  }, [navigate, guildData]);

  return (
    <div className="h-full flex flex-col">
      <FullScreenLoading />
    </div>
  );
};
