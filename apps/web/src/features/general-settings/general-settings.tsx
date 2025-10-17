import { useGuild } from "@/hooks/api/guilds/use-guild";
import { GeneralSettingsForm } from "@/features/general-settings/general-settings-form";

export const GeneralSettings = () => {
  const { data: guild } = useGuild({});

  return (
    <div className="flex-1 p-4">
      <div className="text-lg font-semibold">Ogólne</div>
      <div className="text-sm text-gray-500">Ogólne ustawienia lootloga</div>
      <div>{guild && <GeneralSettingsForm />}</div>
    </div>
  );
};
