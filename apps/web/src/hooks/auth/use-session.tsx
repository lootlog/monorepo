import { authClient } from "@/lib/auth-client";

export type SessionData = {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string | null;
    firstName?: string;
    lastName?: string;
    discordId: string;
    role?: string;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string;
    userAgent?: string;
  };
};

export const useSession = () => {
  return authClient.useSession() as ReturnType<typeof authClient.useSession> & {
    data: SessionData | null;
  };
};
