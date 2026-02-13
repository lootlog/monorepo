export type AdminUserRole = "user" | "admin" | "developer" | "moderator";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  discordId?: string;
};

export type AdminUsersListResponse = {
  users: AdminUser[];
  total: number;
  limit?: number;
  offset?: number;
};

export type AdminUserSession = {
  id: string;
  userId: string;
  token: string;
  expiresAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  impersonatedBy?: string | null;
};

export type AdminUserSessionsResponse = {
  sessions: AdminUserSession[];
};

export type AdminPermissionResource = "user" | "session" | "addon";

export type AdminPermissions = Partial<
  Record<AdminPermissionResource, string[]>
>;
