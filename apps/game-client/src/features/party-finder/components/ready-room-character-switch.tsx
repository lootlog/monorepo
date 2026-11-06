import { useReadyRoomCharacterSwitch } from "@/features/party-finder/hooks/use-ready-room-character-switch";

/**
 * Hosts the character-switch follow-up in its own component, so gathering
 * and Ready Room updates re-render only this leaf, not the overlay root.
 */
export function ReadyRoomCharacterSwitch() {
  useReadyRoomCharacterSwitch();

  return null;
}
