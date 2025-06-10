import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { useSession } from "@/hooks/auth/use-session";

type Props = {
  component: React.ComponentType;
};

export const AuthenticationGuard: React.FC<Props> = ({ component }) => {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <FullScreenLoading />;
  }

  if (!session) {
    window.location.href = "/";
  }

  const Component = component;

  return <Component />;
};
