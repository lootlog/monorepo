import { useSession } from "@/hooks/auth/use-session";

import { UserSidebar } from "@/components/layout/user-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { PageContainer } from "@/components/ui/page-container";

export const Home: React.FC = () => {
  const { data: session } = useSession();

  return (
    <div className="h-screen max-h-screen overflow-y-auto flex flex-row">
      <SidebarProvider>
        <UserSidebar />
        <PageContainer>
          <PageHeader>
            <div className="w-full flex">
              <SidebarTrigger />
              <div className="flex justify-between w-full pl-2 items-center">
                <div className="flex flex-row items-center gap-4">
                  <h1 className="font-semibold p-0">{session?.user.name}</h1>
                </div>
              </div>
            </div>
          </PageHeader>
          <div className="w-full h-[calc(100%-64px)] flex items-center justify-center">
            Home screen, tutaj będzie dashboard, statystyki, itp. (WIP)
          </div>
        </PageContainer>
      </SidebarProvider>
    </div>
  );
};
