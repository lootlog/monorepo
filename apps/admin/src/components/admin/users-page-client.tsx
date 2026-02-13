"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
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
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import type { AdminUser, AdminUsersListResponse } from "@/src/lib/types/admin";

const PAGE_SIZE = 20;

const extractApiError = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" ? error : null;
};

const roleBadgeVariant = (role?: string | null) => {
  if (role?.includes("admin")) {
    return "green" as const;
  }

  if (role?.includes("moderator")) {
    return "secondary" as const;
  }

  if (role?.includes("developer")) {
    return "outline" as const;
  }

  return "default" as const;
};

const asDisplayRole = (role?: string | null) => {
  if (!role) {
    return "user";
  }

  return role;
};

export function UsersPageClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);

    try {
      const offset = (page - 1) * PAGE_SIZE;
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        sortBy: "createdAt",
        sortDirection: "desc",
      });

      if (appliedSearch) {
        query.set("searchField", "email");
        query.set("searchOperator", "contains");
        query.set("searchValue", appliedSearch);
      }

      const response = await fetch(`/admin/api/users?${query.toString()}`, {
        cache: "no-store",
      });

      const payload = (await response.json()) as
        | AdminUsersListResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(extractApiError(payload) || "Failed to fetch users");
      }

      setUsers((payload as AdminUsersListResponse).users || []);
      setTotal((payload as AdminUsersListResponse).total || 0);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to fetch users",
      );
      setUsers([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [appliedSearch, page]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [total]);

  const fromItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toItem = Math.min(total, page * PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Search, inspect and manage user accounts from Better Auth admin
          plugin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-col gap-2 md:flex-row"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setPage(1);
            setAppliedSearch(searchInput.trim());
          }}
        >
          <Input
            placeholder="Search by email"
            value={searchInput}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setSearchInput(event.target.value)
            }
          />
          <Button type="submit" className="md:w-auto">
            Search
          </Button>
          {appliedSearch && (
            <Button
              type="button"
              variant="outline"
              onClick={(): void => {
                setSearchInput("");
                setAppliedSearch("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </form>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Spinner />
                      Loading users...
                    </span>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(user.role)}>
                        {asDisplayRole(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.banned ? (
                        <Badge variant="destructive">banned</Badge>
                      ) : (
                        <Badge variant="outline">active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/users/${user.id}`}>Manage</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
          <p className="text-muted-foreground">
            Showing {fromItem}-{toItem} of {total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev: number) => Math.max(1, prev - 1))}
              disabled={page <= 1 || isLoading}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((prev: number) => Math.min(totalPages, prev + 1))
              }
              disabled={page >= totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
