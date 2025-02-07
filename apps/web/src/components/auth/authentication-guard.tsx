import { FullScreenLoading } from "components/ui/full-screen-loading";
import { useSession } from "hooks/auth/use-session";
import { useNavigate } from "react-router-dom";

type Props = {
  component: React.ComponentType;
};

export const AuthenticationGuard: React.FC<Props> = ({ component }) => {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  if (isPending) {
    return <FullScreenLoading />;
  }

  if (!session) {
    navigate("/");
  }

  const Component = component;

  return <Component />;
};
