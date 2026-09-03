import { AUTH_API_URL } from "@/config/api";

interface RealtimeTicketResponse {
  readonly ticket: string;
  readonly expiresAt: number;
}

const isRealtimeTicketResponse = (
  value: unknown,
): value is RealtimeTicketResponse =>
  Boolean(
    value &&
    typeof value === "object" &&
    "ticket" in value &&
    typeof value.ticket === "string" &&
    value.ticket.length > 0 &&
    "expiresAt" in value &&
    typeof value.expiresAt === "number",
  );

export const requestRealtimeTicket = async (): Promise<string> => {
  const response = await fetch(`${AUTH_API_URL}/auth/realtime-ticket`, {
    method: "POST",
    credentials: "include",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("Failed to issue realtime ticket");
  const payload: unknown = await response.json();
  if (!isRealtimeTicketResponse(payload) || payload.expiresAt <= Date.now()) {
    throw new Error("Auth returned an invalid realtime ticket");
  }
  return payload.ticket;
};
