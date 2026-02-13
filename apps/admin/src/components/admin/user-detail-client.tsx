"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import type { AdminUser, AdminUserSession } from "@/src/lib/types/admin";

const ROLES = ["user", "admin", "developer", "moderator"] as const;

const extractApiError = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" ? error : null;
};

const formatDate = (value?: string | Date | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export function UserDetailClient({ userId }: { userId: string }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [sessions, setSessions] = useState<AdminUserSession[]>([]);
  const [selectedRole, setSelectedRole] = useState("user");
  const [banReason, setBanReason] = useState("");
  const [banExpiresIn, setBanExpiresIn] = useState("604800");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const fetchUser = useCallback(async () => {
    const response = await fetch(`/admin/api/users/${userId}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as AdminUser | { error?: string };

    if (!response.ok) {
      throw new Error(extractApiError(payload) || "Failed to fetch user");
    }

    const resolvedUser = payload as AdminUser;
    setUser(resolvedUser);
    setSelectedRole(
      ROLES.includes((resolvedUser.role || "user") as (typeof ROLES)[number])
        ? (resolvedUser.role as string)
        : "user",
    );
  }, [userId]);

  const fetchSessions = useCallback(async () => {
    const response = await fetch(`/admin/api/users/${userId}/sessions`, {
      cache: "no-store",
    });

    const payload = (await response.json()) as
      | { sessions: AdminUserSession[] }
      | { error?: string };

    if (!response.ok) {
      throw new Error(extractApiError(payload) || "Failed to fetch sessions");
    }

    setSessions((payload as { sessions: AdminUserSession[] }).sessions || []);
  }, [userId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchUser(), fetchSessions()]);
      setFeedback(null);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load user",
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchSessions, fetchUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isBanned = useMemo(() => {
    return user?.banned === true;
  }, [user]);

  const updateRole = async () => {
    setIsMutating(true);
    try {
      const response = await fetch(`/admin/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const payload = (await response.json()) as
        | { user: AdminUser }
        | { error?: string };

      if (!response.ok) {
        throw new Error(extractApiError(payload) || "Failed to update role");
      }

      setUser((payload as { user: AdminUser }).user);
      setFeedback({ type: "success", message: "Role updated" });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to update role",
      });
    } finally {
      setIsMutating(false);
    }
  };

  const banCurrentUser = async () => {
    setIsMutating(true);
    try {
      const response = await fetch(`/admin/api/users/${userId}/ban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          banReason: banReason.trim() || undefined,
          banExpiresIn: banExpiresIn ? Number(banExpiresIn) : undefined,
        }),
      });

      const payload = (await response.json()) as
        | { user: AdminUser }
        | { error?: string };

      if (!response.ok) {
        throw new Error(extractApiError(payload) || "Failed to ban user");
      }

      setUser((payload as { user: AdminUser }).user);
      setFeedback({ type: "success", message: "User banned" });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to ban user",
      });
    } finally {
      setIsMutating(false);
    }
  };

  const unbanCurrentUser = async () => {
    setIsMutating(true);
    try {
      const response = await fetch(`/admin/api/users/${userId}/unban`, {
        method: "POST",
      });

      const payload = (await response.json()) as
        | { user: AdminUser }
        | { error?: string };

      if (!response.ok) {
        throw new Error(extractApiError(payload) || "Failed to unban user");
      }

      setUser((payload as { user: AdminUser }).user);
      setFeedback({ type: "success", message: "User unbanned" });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to unban user",
      });
    } finally {
      setIsMutating(false);
    }
  };

  const revokeSession = async (sessionToken: string) => {
    setIsMutating(true);
    try {
      const response = await fetch(
        `/admin/api/users/${userId}/sessions/revoke`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionToken }),
        },
      );

      const payload = (await response.json()) as
        | { success: boolean }
        | { error?: string };

      if (!response.ok) {
        throw new Error(extractApiError(payload) || "Failed to revoke session");
      }

      setFeedback({ type: "success", message: "Session revoked" });
      await fetchSessions();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to revoke session",
      });
    } finally {
      setIsMutating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center gap-2 text-muted-foreground">
        <Spinner />
        Loading user details...
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User not found</CardTitle>
          <CardDescription>
            Unable to load this user from auth service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/users">Back to users</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/users">Back to users</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{user.email}</CardTitle>
          <CardDescription>
            User ID: <span className="font-mono text-xs">{user.id}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback ? (
            <p
              className={`rounded-md border px-3 py-2 text-sm ${
                feedback.type === "error"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-green-500/40 bg-green-500/10 text-green-600"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">role: {user.role || "user"}</Badge>
            {isBanned ? (
              <Badge variant="destructive">banned</Badge>
            ) : (
              <Badge variant="green">active</Badge>
            )}
          </div>

          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p>{user.name || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Discord ID</p>
              <p>{user.discordId || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p>{formatDate(user.createdAt || null)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ban expires</p>
              <p>{formatDate(user.banExpires || null)}</p>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border p-3">
            <p className="text-sm font-medium">Set role</p>
            <div className="flex flex-col gap-2 md:flex-row">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="Choose role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={updateRole} disabled={isMutating}>
                Update role
              </Button>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border p-3">
            <p className="text-sm font-medium">Ban management</p>
            {isBanned ? (
              <Button
                variant="outline"
                onClick={unbanCurrentUser}
                disabled={isMutating}
              >
                Unban user
              </Button>
            ) : (
              <>
                <Input
                  placeholder="Ban reason (optional)"
                  value={banReason}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setBanReason(event.target.value)
                  }
                />
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Ban expires in seconds (optional)"
                  value={banExpiresIn}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setBanExpiresIn(event.target.value)
                  }
                />
                <Button
                  variant="destructive"
                  onClick={banCurrentUser}
                  disabled={isMutating}
                >
                  Ban user
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User sessions</CardTitle>
          <CardDescription>
            Active and historical sessions for the selected user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No sessions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="max-w-[220px] truncate font-mono text-xs">
                        {session.id}
                      </TableCell>
                      <TableCell>{formatDate(session.createdAt)}</TableCell>
                      <TableCell>{formatDate(session.expiresAt)}</TableCell>
                      <TableCell>{session.ipAddress || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isMutating}
                          onClick={() => {
                            void revokeSession(session.token);
                          }}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
