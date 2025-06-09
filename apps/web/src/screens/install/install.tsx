import { ADDON_INSTALL_URL } from "@/config/addon";
import { PageHeader } from "@/components/layout/page-header";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const Install: React.FC = () => {
  return (
    <div className="flex flex-row w-full h-[calc(100%-65px)]">
      <div className="w-full h-full">
        <PageHeader>
          <div className="flex flex-row gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold text-xl p-0">Instalacja</h1>
          </div>
        </PageHeader>

        <div className="p-4">
          <p>Aby zainstalować dodatek, kliknij poniższy link:</p>
          <a
            href={ADDON_INSTALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Instaluj dodatek
          </a>
        </div>
      </div>
    </div>
  );
};
