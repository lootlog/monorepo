import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { useSession } from "@/hooks/auth/use-session";

type Props = {
  children: React.ReactNode;
};

export const AuthenticationGuard: React.FC<Props> = ({ children }) => {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <FullScreenLoading />;
  }

  if (!session) {
    window.location.href = "/";
  }

  return children;
};
