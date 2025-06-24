import { useGuild } from "@/hooks/api/use-guild";
import { GeneralSettingsForm } from "@/screens/general-settings/general-settings-form";

export const GeneralSettings = () => {
  const { data: guild } = useGuild({});

  return (
    <div className="h-full p-4">
      <div className="text-lg font-semibold">Ogólne</div>
      <div className="text-sm text-gray-500">Ogólne ustawienia lootloga</div>
      <div className="flex-1">{guild && <GeneralSettingsForm />}</div>
    </div>
  );
};
