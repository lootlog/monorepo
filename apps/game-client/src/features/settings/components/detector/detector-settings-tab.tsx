import { NpcType } from "@/hooks/api/use-npcs";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { FC } from "react";

export const DetectorSettingsTab: FC = () => {
  const { detectTypes, setDetectTypes } = useNpcDetectorStore();

  return (
    <div className="ll-mb-4 ll-mt-4">
      <label className="ll-font-semibold ll-mb-4">Powiadom o NPC typu:</label>
      <div className="checkbox-custom c-checkbox ll-mt-2">
        <input
          id="hero"
          type="checkbox"
          value={detectTypes[NpcType.HERO] ? "1" : "0"}
          checked={detectTypes[NpcType.HERO]}
          onChange={() => setDetectTypes(NpcType.HERO)}
        />
        <label htmlFor="hero">Heros</label>
      </div>
      <div className="checkbox-custom c-checkbox">
        <input
          id="colossus"
          type="checkbox"
          value={detectTypes[NpcType.COLOSSUS] ? "1" : "0"}
          checked={detectTypes[NpcType.COLOSSUS]}
          onChange={() => setDetectTypes(NpcType.COLOSSUS)}
        />
        <label htmlFor="colossus">Kolos</label>
      </div>
      <div className="checkbox-custom c-checkbox">
        <input
          id="titan"
          type="checkbox"
          value={detectTypes[NpcType.TITAN] ? "1" : "0"}
          checked={detectTypes[NpcType.TITAN]}
          onChange={() => setDetectTypes(NpcType.TITAN)}
        />
        <label htmlFor="titan">Tytan</label>
      </div>
    </div>
  );
};
