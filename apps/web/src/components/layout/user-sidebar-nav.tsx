import { useSession } from "@/hooks/auth/use-session";

export const UserSidebarNav = () => {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col w-full gap-1 flex-1">
      <div className="h-14 min-h-14 flex flex-row items-center border-b mb-2 px-2 font-semibold">
        <span className="ml-3 max-w-44 text-nowrap text-ellipsis overflow-hidden">
          {session?.user?.name}
        </span>
      </div>
    </div>
  );
};
